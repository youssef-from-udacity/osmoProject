$(document).ready(function() {
    var selectedElements = [];
    var selectedvideos = [];
    var lock = false;
    var smallScreen = $(window).width() < 768;

    // load appropriate function according to width of device
    function appropriateDevice() {
        if (smallScreen) {
            smallDevice();
        } else {
            bigDevice();
        }
    }
    appropriateDevice();
    modelForWorker();

    var myModal = $("#myModal");

    //pause animation to start modal
    myModal.on("show.bs.modal", function() {
        lock = true;
        $(selectedElements).each(function() {
            $(this).data("controle")("pause");
        });
    });

    //change the modal opcaity to 1
    myModal.on("shown.bs.modal", function() {
        $('.modal-backdrop.in').css('opacity', '1');
    });

    //pause a youtube video if modal is closed and then resume animation
    myModal.on("hidden.bs.modal", function() {
        lock = false;
        $("#videoPlayer")[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        scrolledElements();
    });

    // for smallDevices
    function smallDevice() {
        loadPhotos();
        var navbar = $("#navigation-btn");
        var selectCarousel = $(".carousel");
        var collectVideos = $("video:not(#main-video)");
        collectVideos.each(function(i, element) {
            selectedvideos.push(element);
        });

        function carouselControl(state) {
            if (state === 'pause') {
                selectCarousel.carousel('pause');
            } else {
                selectCarousel.carousel('cycle');
            }
        }

        selectCarousel.data("controle", carouselControl);
        selectedElements.push(selectCarousel);

        function isSidebarExpanded() {
            if (navbar.attr("aria-expanded") === "false") {
                return false;
            } else {
                return true;
            }
        }
        //stop carousel animation to start sidebar animation in small devices
        function ifSidebarIsExpanded() {
            if (isSidebarExpanded()) {
                lock = false;
                scrolledElements();
            } else {
                lock = true;
                $(selectedElements).each(function() {
                    $(this).data("controle")("pause");
                });
            }
        }
        navbar.click(function() {
            ifSidebarIsExpanded();
        });
    }

    // preload and cash images if width<769px:
    function loadPhotos() {
        var str = "dist/img/carousel/";
        var imageSrcs = ["fc91528.11.jpg", "5a9c369.8.jpg", "/1a08d30.9.jpg", "/7672e35.3.jpg", "/aacc1f5.4.jpg", "b34dcc2.1.jpg", "d420e48.10.jpg", "d802fa5.5.jpg", "faf188e.2.jpg", "6095cbc.7.jpg"];
        var images = [];
        preloadImages(imageSrcs, images, callmeBack);

        function callmeBack() {
            console.log("hey images preloaded hi5");
        }

        function preloadImages(srcs, imgs, callback) {
            srcs.forEach(function(url) {
                _load(url, imgs, callback);
            });
        }

        function _load(url, imgs, callback) {
            var img = new Image();
            img.onload = function() {
                callback();
            };
            img.src = str + url;
            imgs.push(img);
        }
    }

    function bigDevice() {
        var menugame = $("#menu-game");
        var collectVideos = $("video");
        collectVideos.each(function(i, element) {
            selectedvideos.push(element);
            selectedElements.push(element);
        });
        // check if menu game is expanded
        function isMenugameExpanded() {
            if (menugame.attr("aria-expanded") === "true") {
                return true;
            } else {
                return false;
            }
        }
        //pause or play a video to start menugame animation
        menugame.click(function() {
            if (isMenugameExpanded()) {
                lock = false;
                scrolledElements();
            } else {
                lock = true;
                $(selectedElements).each(function() {
                    $(this).data("controle")("pause");
                });
            }
        });
    }

    // load the iframe
    function loadIframe() {
        $("iframe").each(function(i, element) {
            element.setAttribute("src", element.getAttribute("data-src"));
            $("#palyButton").show();
        });
    }

    function modelForWorker() {

        // setting web worker
        var worker = null;
        var workerUrl = "../../worker.js";
        // fallback for worker
        function createWorkerFallback(workerUrl) {
            try {
                var blob;
                try {
                    blob = new Blob(["importScripts('" + workerUrl + "');"], {
                        "type": 'application/javascript'
                    });
                } catch (e) {
                    var blobBuilder = new(window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
                    blobBuilder.append("importScripts('" + workerUrl + "');");
                    blob = blobBuilder.getBlob('application/javascript');
                }
                var url = window.URL || window.webkitURL;
                var blobUrl = url.createObjectURL(blob);
                worker = new Worker(blobUrl);
            } catch (e1) {
                //if it still fails, there is nothing much we can do
            }
            return worker;
        }
        try {
            worker = new Worker(workerUrl);
            worker.onerror = function(event) {
                event.preventDefault();
                worker = createWorkerFallback(workerUrl);
            };
        } catch (e) {
            worker = createWorkerFallback(workerUrl);
        }
        var i, obj = document.createElement('video');
        (obj.canPlayType('video/webm') !== "") ? i = 0: i = 1;

        // this is an array of object containing information about video
        var domVideos = selectedvideos.map(function(video, index) {
            var videoSrc = $(video).find("source").get(i);
            return {
                id: "video-" + index,
                src: videoSrc.getAttribute("data-src"),
                node: videoSrc,
                video: video
            };
        });

        // load videos through worker
        function videoWorkerLoad() {
            var lazyload = $(".lazyload");
            var count = 0;

            function removeLazyload() {
                // remove lazyload class each time untill videos finish
                //then remove the rest of lazyload classes
                $.each(lazyload, function(index, element) {
                    if (count === 0) {
                        loadIframe();
                    }
                    $(element).removeClass("lazyload");
                    count += 1;
                    lazyload = lazyload.slice(1);
                    if (count < postArr.length) {
                        return false;
                    }
                });
            }

            worker.onmessage = function(e) {
                $.each(domVideos, function(index, value) {
                    var id = e.data[0];
                    var src = e.data[1];
                    var node;

                    // append src to loaded source and then load video
                    if (value.id === id) {
                        node = value.node;
                        node.src = src;

                        $(value.video).get(0).load();
                        removeLazyload();
                    }
                });
            };
            // object to post
            var postArr = $.each(domVideos, function(index, value) {
                value = {
                    id: value.id,
                    src: value.src
                };
            });
            // make a copy of postArr
            var postObj = JSON.parse(JSON.stringify(postArr));

            worker.postMessage(postObj);

            worker.onerror = function(error) {
                function WorkerException(message) {
                    this.name = "WorkerException";
                    this.message = message;
                }
                throw new WorkerException('worker error.');
            };
        }

        videoWorkerLoad();
    }
    modelForWorker();

    var navbarHeight;
    var height;

    function getHeight() {
        navbarHeight = $("#navbar-fixed-top").height();
        height = $(window).height();
    }
    getHeight();
    $(window).on('resize', getHeight);

    // check if element is in view port
    $.fn.isInViewport = function() {
        var elementTop = $(this).offset().top;
        var elementBottom = elementTop + $(this).outerHeight();

        var viewportTop = $(window).scrollTop() + (height / 4) + navbarHeight;
        var viewportBottom = viewportTop + (height / 2) - navbarHeight;


        return elementBottom > viewportTop &&
            elementBottom < viewportBottom ||
            elementTop > viewportTop &&
            elementTop < viewportBottom ||
            elementTop < viewportTop &&
            elementBottom > viewportBottom;
    };

    // to play or pause a video
    function pauseOrPlayVideo(element) {
        return function(state) {
            if (state === 'pause') {
                element.get(0).pause();
            } else {
                element.get(0).play();
            }
        };
    }

    var streamingElement = selectedElements[0];
    var ticking = false;
    var delay = false;
    var isScrolling;

    $(window).on('resize scroll', function() {
        // pause all videos before checking if they are in the veiwport
        if (!delay) {
            $(streamingElement).data("controle")("pause");
            delay = true;
            window.setTimeout(function() {
                delay = false
            }, 400);
        }

        window.clearTimeout(isScrolling);
        // Set a timeout to run after scrolling ends
        isScrolling = setTimeout(function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    scrolledElements();
                    ticking = false;
                });
                ticking = true;
            }

        }, 400);
    });
    // append the funciton pauseOrPlayVideo to each video node data
    $(selectedvideos).each(function(index) {
        var element = $(this);
        element.data("controle", pauseOrPlayVideo(element));
        selectedElements.push(element);
    });
    // if scrolled elements is within view port play oe pause them otherwise
    function scrolledElements() {
        $(selectedElements).each(function(index) {
            var element = $(this);
            if (element.isInViewport() && !lock) {
                element.data("controle")("play");
                streamingElement = element;
                return false;
            } else {
                element.data("controle")("pause");
            }
        });
    }

    // main visibility API function
    // use visibility API to check if current tab is active or not
    // if not stop animation
    var vis = (function() {
        var stateKey,
            eventKey,
            keys = {
                hidden: "visibilitychange",
                webkitHidden: "webkitvisibilitychange",
                mozHidden: "mozvisibilitychange",
                msHidden: "msvisibilitychange"
            };
        for (stateKey in keys) {
            if (stateKey in document) {
                eventKey = keys[stateKey];
                break;
            }
        }
        return function(c) {
            if (c) document.addEventListener(eventKey, c);
            return !document[stateKey];
        };
    })();
    // check if current tab is active or not
    vis(function() {

        if (vis() && !lock) {

            // tween resume() code goes here
            scrolledElements();
            setTimeout(function() {
                console.log("tab is visible and has focus");
            }, 300);

        } else {

            // tween pause() code goes here
            $(selectedElements).each(function() {
                $(this).data("controle")("pause");
            });
            console.log("tab is invisible and has blur");
        }
    });

});