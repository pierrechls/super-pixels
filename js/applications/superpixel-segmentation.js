'use strict';

function Main() {
    this.colors = 30;
    this.prevColors = 0;

    $('#superpixel-segmentation-content canvas').remove();

    var canvas = im.createCanvas(1,1, $('#superpixel-segmentation-content-result'));
    var rgb, lab, mat;

    var image = new Image();
    image.src = im.getSampleImage();
    var self = this;
    this.refresh = function() {
        if (self.prevColors === self.colors) return;
        var result = im.superpixel(lab, self.colors, 1, false);
        var contours = im.drawContours(result.centers);
        var contG = im.add(rgb[2], contours);
        var tmpG = rgb[2];
        var original = [];
        for (var i = 0; i < 3; i++) {
            original[i] = rgb[i];
            rgb[i] = (i!==2) ? im.sub(rgb[i], contours) : im.add(rgb[i], contours);
        }
        canvas = im.mat2canvas(rgb, canvas);
        for (var i = 0; i < 3; i++)
            rgb[i] = original[i];
        //canvas = im.mat2canvas(hsv[2], canvas);
        self.prevColors = self.colors;
    };
    image.onload = function() {
        rgb = im.image2mat(image, 0.5, im.RGB);
        lab = rgb.cvtColor(im.Lab);
    	mat = lab[0];
        self.refresh();
    };
}

function previewFile(){
       var preview = document.querySelector('img#image-uploaded'); //selects the query named img
       var file    = document.querySelector('input[type=file]#input-upload').files[0]; //sames as here

       var reader  = new FileReader();

       reader.onloadend = function () {
           preview.src = reader.result;
           if(file && (file.size < 600000)) {
             var main = new Main();
             $('#log-image-too-big').hide()
           } else {
             $('#superpixel-segmentation-content canvas').remove()
             $('#log-image-too-big').show()
           }
       }

       if (file) {
           reader.readAsDataURL(file); //reads the data as a URL
       } else {
           preview.src = "";
       }
}

previewFile();

// window.onload = function() {
//     var main = new Main();
// };
