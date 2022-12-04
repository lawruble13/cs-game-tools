
injectQueue = []
function injectElement() {
    if (injectQueue.length > 0) {
        [element, insert_location] = injectQueue.pop()
        insert_location.append(element)
    }
}

function queueInject(element, insert_location) {
    injectQueue.splice(0, 0, [element, insert_location])
}

function injectBackButton() {
    var backButton = $("#ddSnoopBackButton")
    if (backButton.length) {
        if (!backButton.is(":last-child")) {
            var parent = backButton.parent()
            backButton.remove()
            queueInject(backButton, parent)
        }
    } else {
        backButton = "<button class=\"spacedLink\" onClick=\"goBack()\" id=\"ddSnoopBackButton\">Back</button>"
        queueInject(backButton, $('p#buttons'))
    }
}

function injectModal() {
    var modal = $("#snooper-modal")
    if (modal.length == 0) {
        modal = document.createElement("div")
        modal.id = "snooper-modal"
        queueInject(modal, document.body)
    }
}

function injectModalContainer() {
    var modal_container = $("#snooper-modal-container")
    if (modal_container.length == 0) {
        modal_container = document.createElement("div")
        modal_container.id = "snooper-modal-container"
        queueInject(modal_container, document.body)
    }
}

function injectScript(script_name) {
    var script_id = script_name.split('/')
    script_id = script_id[script_id.length - 1]
    script_id = script_id.split('.')[0]
    script_id = "script-" + script_id
    var existing_element = $('#' + script_id)
    if (existing_element.length == 0) {
        var script_path = browser.runtime.getURL(script_name)
        var script_element = document.createElement("script")
        script_element.id = script_id
        script_element.setAttribute("src", script_path)
        script_element.setAttribute("crossorigin", "anonymous")
        queueInject(script_element, document.head)
    }
}

function injectCSS(sheet_name) {
    var sheet_id = sheet_name.split('/')
    sheet_id = sheet_id[sheet_id.length - 1]
    sheet_id = sheet_id.split('.')[0]
    sheet_id = "sheet-" + sheet_id
    var existing_element = $('#' + sheet_id)
    if (existing_element.length == 0) {
        var sheet_path = browser.runtime.getURL(sheet_name)
        var sheet_element = document.createElement("link")
        sheet_element.setAttribute("rel", "stylesheet")
        sheet_element.setAttribute("crossorigin", "anonymous")
        sheet_element.id = sheet_id
        sheet_element.setAttribute("href", sheet_path)
        queueInject(sheet_element, document.head)
    }
}

function injectSnooper() {
    injectCSS("src/inject/snooper-modal.css")
    injectBackButton()
    injectModalContainer()
    injectScript("src/jquery-3.6.1.min.js")
    injectScript("src/inject/variables.js")
    injectScript("src/inject/functions.js")
    injectScript("src/inject/sceneModifications.js")
}

function timedInject() {
    if ($("p#buttons").length > 0) {
        injectSnooper()
        return true
    }
    return false
}

$(document).ready(() => {
    setInterval(timedInject, 1000);
    setInterval(injectElement, 25);
})
