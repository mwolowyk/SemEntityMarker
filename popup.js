window.onload = function() {
    document.getElementById("button1").onclick = function() {
        console.log('Clicked button1');
        chrome.extension.sendMessage({
            type: "color-divs"
        });
    };

    document.getElementById("button2").onclick = function() {
        console.log('Clicked Dimensions');
        chrome.extension.sendMessage({
            type: "dimensions"
        });
    };

    document.getElementById("button3").onclick = function() {
        console.log('Clicked Unsilo');
        chrome.extension.sendMessage({
            type: "unsilo"
        });
    };

    document.getElementById("button4").onclick = function() {
        console.log('Clicked SciGraph');
        chrome.extension.sendMessage({
            type: "scigraf"
        });
    }

}