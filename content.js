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

function getEntitiesForUnsilo(doi){
    const url = 'https://api.unsilo.com/springer/related-content/2.7/document/v4/by-id/'.concat(doi);
    const data = {
    };

    return makeAjaxCall(url, 'GET', data);
};

function getAbstractForEntity(entity){
    const url = `http://dbpedia.org/sparql/?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=prefix+dbpedia%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fresource%2F%3E%0D%0Aprefix+dbpedia-owl%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fontology%2F%3E%0D%0Aselect+%3Fabstract+where+%7B+++%0D%0Adbpedia%3A${entity}+dbpedia-owl%3Aabstract+%3Fabstract+.%0D%0Afilter%28langMatches%28lang%28%3Fabstract%29%2C%22en%22%29%29%7D&format=application%2Fsparql-results%2Bjson&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=30000&debug=on&run=+Run+Query+`;
    return makeAjaxCall(url, 'GET');
}

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
        let resourceUri = r['@URI'];
        if (processedResources.indexOf(resourceText) < 0) {
            // const wikiUri = resourceUri.replace('http://dbpedia.org/resource/', 'https://en.wikipedia.org/wiki/');
            innerHtml = innerHtml.replace(" " + resourceText + " ", '<a class="sementity tooltip" href="' + resourceUri + '"> ' + resourceText + ' </a>');
            processedResources.push(resourceText);
        }

    });
    return innerHtml;
}

function addSearchLink(respJson, innerHtml) {
    const docs = respJson.documents.slice(1, 4);
    var res = '<div class="unsilo-articles"><h3>Related articles: </h3>'
    docs.forEach( function (d) {
        const docTitle = d.title
        const docDoi = d.id
        res = res + '<div class="unsilo-article"><a href="https://link.springer.com/' + docDoi + '">' + docTitle + '</a></div><br/>'
    });
    res+= '</div>';
    innerHtml = innerHtml.replace("Article", res);
    console.log('Inner: ', innerHtml);
    return innerHtml;
}

function createToolTips(){
    var $sementity = $('.sementity');
    $sementity.each(function(e, v){
        let entity = v.href.replace('http://dbpedia.org/resource/', '');
        getAbstractForEntity(entity).then(function(resp){
            var txt3 = document.createElement("span");
            txt3.className = 'tooltiptext';
            let abstract = resp.results.bindings[0].abstract.value;
            console.log('abstract: ', abstract);
            txt3.innerText = abstract;
            v.append(txt3);
        });
    });
};

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.type) {
        case "colors-div":
            const selectors = $('.Para');
            const selectorToRequestMap = [];
            selectors.each(function(index, selector){
                const text = selector.innerText.replace(/(?:\r\n|\r|\n|")/g, ' ');
                if(text){
                    let request = getEntities(text);
                    selectorToRequestMap.push({selector: selector, request: request});
                }
            });

            selectorToRequestMap.forEach(function(selectorToRequest){
                const selector = selectorToRequest.selector;
                const request = selectorToRequest.request;

                request.then(function(respJson){
                    selector.innerHTML = replaceTextWithSementities(respJson, selector.innerText);
                    createToolTips();

                }, function(reason){
                    console.error("error in processing your request", reason);
                });
            });
            break;

        case "dimensions":
            var splittedPath = location.pathname.split("/");
            var doi = splittedPath[splittedPath.length-1];
            getEntitiesForDimensions(doi).then()
            break;

        case "unsilo":
            var splittedPath = location.pathname.split("/");
            var doi = splittedPath[splittedPath.length-1];

            var selector = $('.main-context__container');
            var innerHtml = selector.html();

            var ents = getEntitiesForUnsilo(doi);
            ents.then(function(respJson) {
                innerHtml = addSearchLink(respJson, innerHtml);
                selector.html(innerHtml);
            })
            break;
    }
});