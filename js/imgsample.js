var im = im || {};
(function() {
    im.getSampleImage = function() {
        return $('img#image-uploaded')[0].currentSrc
    };
})();
