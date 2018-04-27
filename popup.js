window.onload = function() {
    document.getElementById("button1").onclick = function() {
        console.log('Clicked button1');
        chrome.extension.sendMessage({
            type: "color-divs"
        });
    }
}