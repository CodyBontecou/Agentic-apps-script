/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('Gmail Assistant')
        .addItem('Open Dashboard', 'showDashboard')
        .addToUi()

    DocumentApp.getUi()
        .createMenu('Gmail Assistant')
        .addItem('Open Dashboard', 'showDashboard')
        .addToUi()

    FormApp.getUi()
        .createMenu('Gmail Assistant')
        .addItem('Open Dashboard', 'showDashboard')
        .addToUi()

    SlidesApp.getUi()
        .createMenu('Gmail Assistant')
        .addItem('Open Dashboard', 'showDashboard')
        .addToUi()
}

/**
 * Shows the dashboard as a sidebar in the UI.
 */
function showDashboard() {
    const html = HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Gmail Assistant')
        .setWidth(400)

    const ui = getActiveUi()
    if (ui) {
        ui.showSidebar(html)
    } else {
        // If no active UI, show as a modal dialog
        showDashboardAsDialog()
    }
}

/**
 * Shows the dashboard as a modal dialog.
 */
function showDashboardAsDialog() {
    const html = HtmlService.createHtmlOutputFromFile('index')
        .setWidth(800)
        .setHeight(600)

    SpreadsheetApp.getUi().showModalDialog(html, 'Gmail Assistant')
}

/**
 * Gets the active UI based on the current Google Workspace app.
 */
function getActiveUi() {
    try {
        return SpreadsheetApp.getUi()
    } catch (e) {
        try {
            return DocumentApp.getUi()
        } catch (e) {
            try {
                return FormApp.getUi()
            } catch (e) {
                try {
                    return SlidesApp.getUi()
                } catch (e) {
                    return null
                }
            }
        }
    }
}

/**
 * Doget handler for web app deployment.
 */
function doGet() {
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Gmail Assistant')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

/**
 * Get user settings from PropertyService.
 */
function getSettings() {
    const properties = PropertiesService.getUserProperties()
    const settings = {
        maxEmails: properties.getProperty('maxEmails') || 50,
        model: properties.getProperty('model') || 'gemini-2.0-flash-001',
        scheduleFrequency:
            properties.getProperty('scheduleFrequency') || 'none',
        lastRun: properties.getProperty('lastRun') || null,
        emailsProcessed: properties.getProperty('emailsProcessed') || 0,
        actionsTaken: properties.getProperty('actionsTaken') || 0,
    }

    return settings
}

/**
 * Save user settings to PropertyService.
 */
function saveSettings(settings) {
    const properties = PropertiesService.getUserProperties()

    if (settings.maxEmails)
        properties.setProperty('maxEmails', settings.maxEmails)
    if (settings.model) properties.setProperty('model', settings.model)
    if (settings.scheduleFrequency)
        properties.setProperty('scheduleFrequency', settings.scheduleFrequency)

    // Update triggers based on schedule
    updateTriggers(settings.scheduleFrequency)

    return true
}

/**
 * Update triggers based on selected schedule.
 */
function updateTriggers(frequency) {
    // Clear existing triggers
    const triggers = ScriptApp.getProjectTriggers()
    for (let i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'runProcessTrigger') {
            ScriptApp.deleteTrigger(triggers[i])
        }
    }

    // Create new trigger based on frequency
    if (frequency === 'hourly') {
        ScriptApp.newTrigger('runProcessTrigger')
            .timeBased()
            .everyHours(1)
            .create()
    } else if (frequency === 'daily') {
        ScriptApp.newTrigger('runProcessTrigger')
            .timeBased()
            .everyDays(1)
            .atHour(6)
            .create()
    } else if (frequency === 'weekly') {
        ScriptApp.newTrigger('runProcessTrigger')
            .timeBased()
            .everyWeeks(1)
            .onWeekDay(ScriptApp.WeekDay.MONDAY)
            .atHour(6)
            .create()
    }
}

/**
 * Get Gmail labels for display.
 */
function getLabels() {
    // Importing the function from helpers.js
    return _getGmailUserLabels()
}

/**
 * Get processing history.
 */
function getHistory() {
    const history = []

    try {
        // Try to load history from Properties
        const historyJson =
            PropertiesService.getUserProperties().getProperty('processHistory')
        if (historyJson) {
            return JSON.parse(historyJson)
        }
    } catch (e) {
        console.error('Error loading history:', e)
    }

    return history
}

/**
 * Add entry to history.
 */
function addToHistory(entry) {
    let history = getHistory()

    // Add new entry
    history.unshift(entry)

    // Keep only the last 50 entries
    if (history.length > 50) {
        history = history.slice(0, 50)
    }

    // Save back to properties
    PropertiesService.getUserProperties().setProperty(
        'processHistory',
        JSON.stringify(history)
    )
}

/**
 * Run the email processing.
 */
function runProcess() {
    const settings = getSettings()
    const activity = []
    let emailsProcessed = 0
    let actionsTaken = 0

    try {
        // Configure parameters from settings
        const MODEL = settings.model
        const PROJECT_ID = 'agentic-app-script' // From your main.js
        const MAX_EMAILS = parseInt(settings.maxEmails) || 50

        // Log start of processing
        activity.push(
            `Starting email processing at ${new Date().toLocaleString()}`
        )

        // Process threads with logging
        const threads = GmailApp.getInboxThreads(0, MAX_EMAILS)
        emailsProcessed = threads.length

        // Override the console.log to capture logs
        const originalLog = console.log
        console.log = function (message) {
            activity.push(message)
            originalLog.apply(console, arguments)
        }

        // Call the main function
        globalThis.main_({ MODEL, PROJECT_ID })

        // Restore console.log
        console.log = originalLog

        // Count actions based on regex patterns in activity logs
        const actionRegex =
            /Calling (createDraftReply|markAsImportant|applyLabels)/g
        let match
        while ((match = actionRegex.exec(activity.join(' '))) !== null) {
            actionsTaken++
        }

        // Update statistics
        const properties = PropertiesService.getUserProperties()
        properties.setProperty('lastRun', new Date().toISOString())
        properties.setProperty('emailsProcessed', emailsProcessed.toString())

        const totalActions =
            parseInt(properties.getProperty('actionsTaken') || '0') +
            actionsTaken
        properties.setProperty('actionsTaken', totalActions.toString())

        // Add to history
        for (const thread of threads) {
            const subject = thread.getFirstMessageSubject()
            const actions = []

            // Extract actions for this thread
            const threadLogs = activity.filter(log => log.includes(subject))
            for (const log of threadLogs) {
                if (log.includes('Calling createDraftReply'))
                    actions.push('Created draft')
                if (log.includes('Calling markAsImportant'))
                    actions.push('Marked important')
                if (log.includes('Calling applyLabels'))
                    actions.push('Applied labels')
            }

            if (actions.length > 0) {
                addToHistory({
                    timestamp: new Date().toISOString(),
                    subject: subject,
                    actions: actions,
                })
            }
        }

        // Log completion
        activity.push(`Completed processing at ${new Date().toLocaleString()}`)

        return {
            success: true,
            emailsProcessed: emailsProcessed,
            actionsTaken: actionsTaken,
            activity: activity,
        }
    } catch (error) {
        console.error(error)
        activity.push(`Error: ${error.toString()}`)

        return {
            success: false,
            error: error.toString(),
            emailsProcessed: emailsProcessed,
            actionsTaken: actionsTaken,
            activity: activity,
        }
    }
}

/**
 * Trigger handler for scheduled runs.
 */
function runProcessTrigger() {
    runProcess()
}

/**
 * Makes the getGmailUserLabels function available to the UI
 */
function _getGmailUserLabels() {
    return (Gmail?.Users?.Labels?.list('me')?.labels ?? []).filter(Boolean)
}
