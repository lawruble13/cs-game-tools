
function injectBackButton() {
    var backButton = $("#ddSnoopBackButton")
    if (backButton.length) {
        var parent = backButton.parent()
        backButton.remove()
        parent.append(backButton)
    } else {
        backButton = "<button class=\"spacedLink\" onClick=\"goBack()\" id=\"ddSnoopBackButton\">Back</button>"
        $('p#buttons').append(backButton)
    }
}

function injectModal() {
    var modal = $("#snooper-modal")
    if (modal.length == 0) {
        modal = document.createElement("div")
        modal.id = "snooper-modal"
        document.body.append(modal)
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
        document.head.append(script_element)
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
        sheet_element.id = sheet_id
        sheet_element.setAttribute("href", sheet_path)
        document.head.append(sheet_element)
    }
}

function injectSnooper() {
    injectCSS("src/inject/snooper-modal.css")
    injectBackButton()
    injectModal()
    injectScript("src/inject/variables.js")
    setTimeout(injectScript, 100, "src/inject/functions.js")
    setTimeout(injectScript, 200, "src/inject/sceneModifications.js")
}

function timedInject() {
    if ($("p#buttons").length > 0) {
        injectSnooper()
    }
}

$(document).ready(() => {
    setInterval(timedInject, 1000);
})
