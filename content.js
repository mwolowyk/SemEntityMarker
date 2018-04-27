chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if( request.message === "clicked_browser_action" ) {
            var firstHref = $("a[href^='http']").eq(0).attr("href");

            console.log(firstHref);

            // This line is new!
            chrome.runtime.sendMessage({"message": "open_new_tab", "url": firstHref});
        }
    }
);

function makeAjaxCall(url, methodType, data, callback){
    return $.ajax({
        url: url,
        method: methodType,
        data: data,
        dataType: "json"
    });
}

function getEntities(text, v){
    const url = 'http://model.dbpedia-spotlight.org/en/annotate';
    const data = {
        confidence : 0.35,
        text: text
    };

   return makeAjaxCall(url, 'GET', data);
};


function getEntitiesForSciGraph(doi){
    const url = 'https://scigraph.springernature.com/api/redirect';
    const data = {
        doi : doi
    };

    return makeAjaxCall(url, 'GET', data);
};

function replaceTextWithSementities(respJson, innerHtml) {
    const resourses = respJson.Resources;
    const processedResources = [];
    console.log('Response: ', respJson.Resources);
    resourses.forEach(function (r) {
        const resourceText = r['@surfaceForm'];
        const resourceUri = r['@URI'];
        if (processedResources.indexOf(resourceText) < 0) {

            innerHtml = innerHtml.replace(" " + resourceText + " ", '<a class="sementity tooltip" href="' + resourceUri + '"> ' + resourceText + ' </a>');
            processedResources.push(resourceText);
        }

    });
    return innerHtml;
}

function createToolTips(){
    var $sementity = $('.sementity');
    $sementity.each(function(e, v){
        var txt3 = document.createElement("span");
        txt3.className = 'tooltiptext';
        txt3.innerText = v.href.replace('https://dbpedia.org/resource/', ':');
        v.append(txt3);
    });
};

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.type) {
        case "colors-div":
            var selector = $('.Para');
            var innerHtml = selector.html();
            const requests = [];
            selector.each(function(i, v){
                const text = v.innerText.replace(/(?:\r\n|\r|\n|")/g, ' ');
                if(text){
                    let request = getEntities(text);
                    requests.push({selector: v, request: request});
                }
            });

            requests.forEach(function(v){
                const selector = v.selector;
                const request = v.request;

                console.log("selector: ", selector.innerText);
                console.log("Request: ", request);

                request.then(function(respJson){
                    innerHtml = replaceTextWithSementities(respJson, innerHtml);
                    selector.innerHTML = innerHtml;

                    createToolTips();

                }, function(reason){
                    console.error("error in processing your request", reason);
                });
            });





            break;

        case "scigraph":
            var splittedPath = location.pathname.split("/");
            var doi = splittedPath[splittedPath.length-1];
            console.log("Scigraph: ",  doi);
            // getEntitiesForSciGraph(doi).then()
            break;
    }
});