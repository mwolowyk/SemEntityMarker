// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
    // Send a message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
    });
});

// This block is new!
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if( request.message === "open_new_tab" ) {
            chrome.tabs.create({"url": request.url});
        }
    }
);

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.type) {
        case "dom-loaded":
            alert(request.data.myProperty);
            break;
    }
    return true;
});


// listening for an event / one-time requests
// coming from the popup
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Called request: ', request);
    switch(request.type) {
        case "color-divs":
            colorDivs();
            break;
    }
    return true;
});

// listening for an event / long-lived connections
// coming from devtools
chrome.extension.onConnect.addListener(function (port) {

    port.onMessage.addListener(function (message) {
        switch(port.name) {
            case "color-divs-port":
                colorDivs();
                break;
        }
    });
});

// send a message to the content script
var colorDivs = function() {
    chrome.tabs.getSelected(null, function(tab){
        chrome.tabs.sendMessage(tab.id, {type: "colors-div", color: "#f9ffbf"});
        // setting a badge
        chrome.browserAction.setBadgeText({text: "marked!"});
    });
}