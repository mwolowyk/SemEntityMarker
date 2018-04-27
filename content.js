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

function makeAjaxCall(url, methodType, data, headers, datatype='application/json'){
    return $.ajax({
        accepts: {
            json: datatype
        },
        url: url,
        method: methodType,
        data: data,
        dataType: 'json',
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
    const url = `https://scigraph.springernature.com/api/redirect?doi=${doi}`;
    const data = {};
    const headers = [{Accept: 'application/ld+json'}];
    return makeAjaxCall(url, 'GET', data, headers, 'application/ld+json');
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
    const url = 'https://app.dimensions.ai/api/dsl.json';
    const data = `search publications 
where type="article" and doi="${decodeURIComponent(doi)}"
return publications [FOR+FOR_first]`;
    const headers =  {
        'Authorization': "JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJtb2R1bGVzIjpbIndvcmtmbG93IiwiY29kaW5nIiwiZHNsIl0sInN1YiI6ImRzbCt1c2VyMTVAZGltZW5zaW9ucy5haSIsImlhdCI6MTUyNDgzNjExMiwiZXhwIjoxNTI0ODM5NzEyfQ.nD7hMPBcFjIoIob4BzWYTfojtkjAtfBEqZmMDiwGGOtXGnHP_rDb9fjmzyO9gjGgkQWfSfXBQwx4rwFfzctX7w"
    };

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

function getCategories(resp){
    const categories = [];
    resp.publications.forEach(function(el){
       el.FOR.forEach(function(el2){
           categories.push(el2.name);
       });

        el.FOR_first.forEach(function(el3){
            categories.push(el3.name);
        });
    });
    let categoriesDiv = '<div class="sem-categories"><h3>Found categories: </h3>';
    categories.forEach(function(cat){
        categoriesDiv += `<div class="sem-category">${cat}</div>`
    });
    categoriesDiv += '</div>';
    return categoriesDiv;
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

            getEntitiesForDimensions(doi).then(function(resp){
                const categoriesDiv = getCategories(resp);
                $('.main-context').append(categoriesDiv);
            });
            break;

        case "scigraf":
            var splittedPath = location.pathname.split("/");
            var doi = splittedPath[splittedPath.length-1];
            let entitiesForSciGraph = getEntitiesForSciGraph(decodeURIComponent(doi));
            entitiesForSciGraph.then(function(resp){
                console.log('resp: ', resp);
                const articlePath = resp["@graph"].filter(function(el){return el["@id"].indexOf('articles:') === 0})[0]["@id"];
                const articleId = `https://scigraph.springernature.com/things/${articlePath.replace(':', '/')}#connections`;
                const sciGraphDiv = `<div><h3>Article Semantic Graph: </h3><a href="${articleId}">Link to the graph</a>`;
                $('.main-context').append(sciGraphDiv);

                console.log('Graph url: ', articleId );
            });
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