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

function makeAjaxCall(url, methodType, data, headers){
    return $.ajax({
        url: url,
        method: methodType,
        data: data,
        dataType: "json",
        headers: headers
    });
}

function getEntities(text){
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

function getDimensionsToken(auth){
    const url = 'https://app.dimensions.ai/api/auth.json';
    const data = {
        "username": "dsl+user15@dimensions.ai",
        "password": "DimensionsAPIuser15"
    };

    return makeAjaxCall(url, 'POST', data);
};

function getEntitiesForDimensions(doi){
    const url = 'https://app.dimensions.ai/api/auth.json';
    const data = {};
    const headers =  {
        'Authorization': "JWT " + resp.json()[' "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJtb2R1bGVzIjpbIndvcmtmbG93IiwiY29kaW5nIiwiZHNsIl0sInN1YiI6ImRzbCt1c2VyMTVAZGltZW5zaW9ucy5haSIsImlhdCI6MTUyNDgyNjczMCwiZXhwIjoxNTI0ODMwMzMwfQ.wKEkbRjKC_4B7ky0rJ0e0-NTh9uONjwhbBXr5RXiJttvtXWiV_ID_lt7wjzWx_IUOTZil_GLnbet5MvboUhbiw"']
    }

    return makeAjaxCall(url, 'POST', data, headers);
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
    console.log('Got message: ', message);
    console.log('Got sender: ', sender);
    console.log('Got sendResponse: ', sendResponse);

    switch(message.type) {
        case "colors-div":
            var selector = $('.Para');
            var innerHtml = selector.html();
            selector.each(function(i, v){
                const text = v.innerText.replace(/(?:\r\n|\r|\n|")/g, ' ');
                if(text){
                    getEntities(text).then(function(respJson){
                        innerHtml = replaceTextWithSementities(respJson, innerHtml);
                        selector.html(innerHtml);

                        createToolTips();

                    }, function(reason){
                        console.error("error in processing your request", reason);
                    });
                }
            });
            break;

        case "dimensions":
            var splittedPath = location.pathname.split("/");
            var doi = splittedPath[splittedPath.length-1];
            getEntitiesForDimensions(doi).then()
            break;
    }
});