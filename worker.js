// fake dom to make jquery work on worker
importScripts("dist/scripts/workerFakeDOM.js");
importScripts('node_modules/jquery/dist/jquery.min.js');


onmessage = function(e) {
    var videos = e.data;
    //Waiting for Promises to finish
    var chain = $.when();
    var deffered = [];
    $.each(videos, function( index, video ) {
         chain = chain.then(function() {
             $.ajax({
              url: video.src,
              cache: true,
              crossDomain: true,
              async : false
             })
              .done(function( response ) {
                postMessage([video.id, video.src]);
              })  .fail(function() {
                    $.ajax({
                      url: video.src,
                      cache: true,
                      crossDomain: true,
                      async : false
                    })
                      .done(function( response ) {
                        postMessage([video.id, video.src]);
                      })  .fail(function() {
                        console.log( "error" );
                      });
              });
         });
    });
};
