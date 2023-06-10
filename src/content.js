import $ from 'jquery';

let injectQueue = [];
function injectElement() {
    if (injectQueue.length > 0) {
        const [element, insert_location, func] = injectQueue.pop();
        insert_location[func](element);
    }
}
function queueInject(element, insert_location, func = "append") {
    injectQueue.splice(0, 0, [element, insert_location, func]);
}

function injectButtons() {
    var backButton = $("#ddSnoopBackButton");
    var codeButton = $("#ddSnoopCodeButton");
    var optionsButton = $("#csgtOptionsButton");
    var createdAny = false;

    if (backButton.length == 0) {
        backButton =
            '<button class="spacedLink" onClick="goBack()" id="ddSnoopBackButton">Back</button>';
        queueInject(backButton, $("#buttons"));
        createdAny = true;
    }
    if (codeButton.length == 0) {
        codeButton =
            '<button class="spacedLink" onClick="openCode()" id="ddSnoopCodeButton">Code</button>';
        queueInject(codeButton, $("#buttons"));
        createdAny = true;
    }

    if (optionsButton.length == 0) {
        optionsButton =
            '<button class="spacedLink" onClick="csgtOptionsMenu()" id="csgtOptionsButton">CSGT Options</button>';
        queueInject(optionsButton, $("#buttons"));
        createdAny = true;
    }
    if (createdAny) return;

    if (
        !codeButton.is(":last-child") ||
        backButton.next()[0].id != "ddSnoopCodeButton"
    ) {
        var parent = codeButton.parent();
        backButton.remove();
        codeButton.remove();
        queueInject(backButton, parent);
        queueInject(codeButton, parent);
    }

    if (optionsButton.prev()[0].id != "menuButton") {
        var menuButton = document.getElementById("menuButton");
        if (!menuButton) return;
        optionsButton.remove();
        queueInject(optionsButton[0], menuButton, "after");
    }
}

function injectCodeWindow() {
    var codeWindow = $(".popover#codeWindow");
    if (codeWindow.length == 0) {
        codeWindow = document.createElement("div");
        codeWindow.id = "codeWindow";
        codeWindow.classList = ["popover"];
        codeWindow.style = "display: none;";
        codeWindow.setAttribute("onClick", "closeCode()");
        var container = document.createElement("div");
        container.classList = ["code-container"];
        var codeDiv = document.createElement("div");
        codeDiv.classList = ["code"];
        container.appendChild(codeDiv);
        codeWindow.appendChild(container);
        queueInject(codeWindow, document.body);
    }
}

function injectModalContainer() {
    var modal_container = $("#snooper-modal-container");
    if (modal_container.length == 0) {
        modal_container = document.createElement("div");
        modal_container.id = "snooper-modal-container";
        queueInject(modal_container, document.body);
    }
}

function injectScript(script_name) {
    var script_id = script_name.split("/");
    script_id = script_id[script_id.length - 1];
    script_id = script_id.split(".")[0];
    script_id = "script-" + script_id;
    var existing_element = $("#" + script_id);
    if (existing_element.length == 0) {
        var script_path = chrome.runtime.getURL(script_name);
        var script_element = document.createElement("script");
        script_element.id = script_id;
        script_element.setAttribute("src", script_path);
        script_element.setAttribute("crossorigin", "anonymous");
        queueInject(script_element, document.head);
    }
}

function injectCSS(sheet_name) {
    var sheet_id = sheet_name.split("/");
    sheet_id = sheet_id[sheet_id.length - 1];
    sheet_id = sheet_id.split(".")[0];
    sheet_id = "sheet-" + sheet_id;
    var existing_element = $("#" + sheet_id);
    if (existing_element.length == 0) {
        var sheet_path = chrome.runtime.getURL(sheet_name);
        var sheet_element = document.createElement("link");
        sheet_element.setAttribute("rel", "stylesheet");
        sheet_element.setAttribute("crossorigin", "anonymous");
        sheet_element.id = sheet_id;
        sheet_element.setAttribute("href", sheet_path);
        queueInject(sheet_element, document.head);
    }
}

function injectSnooper() {
    // injectCSS("src/inject/style/snooper-modal.css");
    // injectCSS("src/inject/style/popover.css");
    // injectCSS("src/inject/style/other.css");
    injectButtons();
    injectModalContainer();
    injectCodeWindow();
    injectScript("common.bundle.js");
    injectScript("injected.bundle.js");
    // injectScript("src/jquery-3.6.1.min.js");
    // injectScript("src/inject/script/saveCompression.js")
    // injectScript("src/inject/script/lz-string.min.js");
    // injectScript("src/inject/script/swiped-events.min.js")
    // injectScript("src/inject/script/variables.js");
    // injectScript("src/inject/script/functions.js");
    // injectScript("src/inject/script/messaging.js");
    // injectScript("src/inject/script/sceneModifications.js");
    // injectScript("src/inject/script/finish.js");
}

function timedInject() {
    if ($("#buttons").length > 0) {
        injectSnooper();
        return true;
    }
    return false;
}

function getRemoteSync(storeName) {
    return browser.storage.sync
        .get({
            [storeName + "_meta"]: { len: 0, time: 0 },
        })
        .then((meta_items) => {
            let meta = meta_items[storeName + "_meta"];
            return browser.storage.sync
                .get(
                    [...Array(meta.len).keys()].map((x) => storeName + "_" + x)
                )
                .then((data_items) => {
                    let save_data = { time: meta.time, value: "" };
                    for (var i = 0; i < meta.len; i++) {
                        save_data.value += data_items[storeName + "_" + i];
                    }
                    return save_data;
                });
        });
}

function deleteRemoteSync(storeName) {
    return browser.storage.sync
        .get({
            [storeName + "_meta"]: {len: 0, time: 0}
        })
        .then((meta_items) => {
            let meta = meta_items[storeName + "_meta"];
            let items = ([...Array(meta.len).keys()].map((x) => storeName + "_" + x)).concat([storeName + "_meta"])
            return browser.storage.sync
                .remove(items);
        });
};

function getSaveList() {
    return browser.storage.sync.get().then((storage_items) => {
        var saveList = [];
        for (var storage_item_key in storage_items) {
            if (storage_item_key.endsWith("_meta")) {
                saveList.push(
                    storage_item_key.substring(
                        0,
                        storage_item_key.indexOf("_meta")
                    )
                );
            }
        }
        return saveList;
    });
}

function snooperSyncFromRemote() {
    window.postMessage({
        mode: "trigger",
        direction: "to-page-script",
        triggerRequest: true,
    });
}

async function garbageCollectSyncStorage() {
    var storage_items = await browser.storage.sync.get();
    var store_lengths = {};
    var undetermined_keys = [];
    var saved_keys = [];
    var delete_keys = [];
    for (var storage_item_key in storage_items) {
        if (storage_item_key.endsWith("_meta")) {
            var storage_item = storage_items[storage_item_key];
            saved_keys.push(storage_item_key);
            var storeName = storage_item_key.substring(
                0,
                storage_item_key.length - 5
            );
            store_lengths[storeName] = storage_item.len;
            [...Array(storage_item.len).keys()]
                .map((x) => storeName + "_" + x)
                .forEach((element) => {
                    if (undetermined_keys.includes(element)) {
                        undetermined_keys.splice(
                            undetermined_keys.indexOf(element),
                            1
                        );
                        saved_keys.push(element);
                    }
                });
        } else if (/[a-z0-9_ -]+_[0-9]+/i.test(storage_item_key)) {
            var result = /([a-z0-9_ -]+)_([0-9]+)/i.exec(storage_item_key);
            if (store_lengths[result[1]]) {
                if (Number(result[2]) < store_lengths[result[1]]) {
                    saved_keys.push(storage_item_key);
                } else {
                    delete_keys.push(storage_item_key);
                }
            } else {
                undetermined_keys.push(storage_item_key);
            }
        }
    }
    await browser.storage.sync.remove(delete_keys);
    await browser.storage.sync.remove(undetermined_keys);
}

function snooperSyncToRemote(event) {
    if (event.data && event.data.direction == "from-page-script") {
        console.log("Got message:", event);
        if (event.data.mode == "save") {
            let save_data = {};
            let save_data_len = Math.ceil(event.data.save.value.length / 7680);
            save_data[event.data.storeName + "_meta"] = {
                len: save_data_len,
                time: event.data.save.time,
            };
            for (var i = 0; i < save_data_len; i++) {
                save_data[event.data.storeName + "_" + i] =
                    event.data.save.value.slice(i * 7680, (i + 1) * 7680);
            }
            browser.storage.sync.set(save_data).then(
                () => {
                    console.log("saved successfully");
                },
                (err) => {
                    console.log("failed to save to sync: ", err);
                }
            );
        } else if (event.data.mode == "request") {
            getRemoteSync(event.data.storeName).then((saveData) => {
                window.postMessage(
                    {
                        direction: "to-page-script",
                        mode: "load",
                        save: saveData,
                        requested: true,
                        forced: event.data.forced,
                    },
                    "*"
                );
            });
        } else if (event.data.mode == "list") {
            getSaveList().then((allSaved_data) => {
                window.postMessage({
                    direction: "to-page-script",
                    mode: "list",
                    list: allSaved_data,
                    action: event.data.action
                });
            });
        } else if (event.data.mode == "other") {
            getRemoteSync(event.data.name).then((saveData) => {
                window.postMessage({
                    direction: "to-page-script",
                    mode: "copy",
                    otherSave: saveData,
                    name: event.data.name
                });
            });
        } else if (event.data.mode == "settings") {
            if (event.data.settingsData) {
                browser.storage.local.set({ csgtOptions: JSON.stringify(event.data.settingsData) })
            } else {
                browser.storage.local.get("csgtOptions").then((settingsData) => {
                    if (settingsData['csgtOptions']) {
                        window.postMessage({
                            direction: "to-page-script",
                            mode: "settings",
                            settingsData: JSON.parse(settingsData['csgtOptions'])
                        });
                    }
                });
            };
        } else if (event.data.mode == "delete") {
            deleteRemoteSync(event.data.name).then(() => {
                getSaveList().then((allSaved_data) => {
                    window.postMessage({
                        direction: "to-page-script",
                        mode: "list",
                        list: allSaved_data,
                        action: "manage"
                    });
                });
            });
        }
    }
}

injectScript("persist.bundle.js")
injectElement();

$(document).ready(() => {
    setInterval(timedInject, 1000);
    setInterval(injectElement, 25);
    setInterval(garbageCollectSyncStorage, 5 * 60 * 1000);
    garbageCollectSyncStorage();
    browser.storage.sync.onChanged.addListener(snooperSyncFromRemote);
    window.addEventListener("message", snooperSyncToRemote);
});
