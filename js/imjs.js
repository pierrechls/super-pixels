'use strict';

var im = im || {};

(function() {
    /*
     * Canvas and Matrix
     */

    // Create a w x h sized Canvas object. If $parent is defined, append the element.
    // args: w(int): width, h(int): height, $parent($): parent node
    im.createCanvas = function(w, h, $parent) {
        var $canvas = $('<canvas>').attr({
            width: w+"px",
            height: h+"px"
        });
        if ($parent) $parent.prepend($canvas);
        return {
            $canvas: $canvas,
            ctx: $canvas[0].getContext("2d")
        };
    };
    im.resizeCanvas = function($canvas, w, h) {
        $canvas.attr({
            width: w+"px",
            height: h+"px"
        });
    };
    im.tmpCanvas = im.createCanvas(1,1);


    // convert canvas[RGBA] to mat[GRAY/RGB]
    // args: canvas(Canvas): input, image(2DArray/Channels): output, type(int): output color type
    im.canvas2mat = function(canvas, image, type) {
    	// input image
        var $canvas = canvas.$canvas;
        var c = canvas.ctx;
        var w = $canvas[0].width, h = $canvas[0].height;
        var imageData = c.getImageData(0,0, w,h);
        var data = imageData.data;
	// output matrix
        var out = image ||
                (type === im.RGB ?
                 new im.Channels([im.zeros(w, h), im.zeros(w, h), im.zeros(w, h)], w, h, type) :
                 im.zeros(w, h));

        var index = 0;
        if (out.type) {
            for (var i = 0; i < h; i++) {
                var row1 = out[0][i];
                var row2 = out[1][i];
                var row3 = out[2][i];
	        for (var j = 0; j < w; j++) {
                    row1[j] = data[index];
                    row2[j] = data[index+1];
                    row3[j] = data[index+2];
                    index += 4;
                }
            }
        }
        else {
            for (var i = 0; i < h; i++) {
                var row = out[i];
	        for (var j = 0; j < w; j++) {
                    row[j] = 0.3 * data[index] + 0.59 * data[index+1] + 0.11 * data[index+2];
                    index += 4;
                }
            }
        }
        return out;
    };

    // convert image[RGBA] to mat[GRAY/RGB]
    // args: image(Image): input, ?rate(float): magnification ratio, type(int): output color type
    im.image2mat = function(image, rate, type) {
        rate = (rate && rate > 0) ? rate : 1;
        var w = image.width*rate, h = image.height*rate;
        var canvas = im.tmpCanvas;
        var c = canvas.ctx;
        im.resizeCanvas(canvas.$canvas, w, h);
        c.drawImage(image, 0,0, w,h);
        return im.canvas2mat(canvas, undefined, type);
    };

    // conver mat[GRAY/RGB+A] to canvas[RGBA]
    // args: image(2DArray/Channels): input, canvas(Canvas): output
    im.mat2canvas = function(image, canvas) {
    	// output image
        var w, h;
        if (image.type) {
            w = image.w;
            h = image.h;
        }
        else {
            w = image[0].length;
            h = image.length;
        }
        canvas = canvas || im.createCanvas(w, h);
        var $canvas = canvas.$canvas;
        var c = canvas.ctx;
        var imageData = canvas.imageData;
        if ($canvas[0].width !== w || $canvas[0].height !== h) {
            im.resizeCanvas($canvas, w, h);
            imageData = undefined;
        }
        imageData = imageData || c.createImageData(w,h);
        var data = imageData.data;

        var index = 0;
        if (image.type === im.RGB) {
            for (var i = 0; i < h; i++) {
                var row1 = image[0] ? image[0][i] : 0;
                var row2 = image[1] ? image[1][i] : 0;
                var row3 = image[2] ? image[2][i] : 0;
                var row4 = image[3] ? image[3][i] : 0;
	        for (var j = 0; j < w; j++) {
                    data[index] = row1 ? row1[j] : 0;
                    data[index+1] = row2 ? row2[j] : 0;
                    data[index+2] = row3 ? row3[j] : 0;
                    data[index+3] = row4 ? row4[j] : 255;
                    index += 4;
                }
            }
        }
        else {
            for (var i = 0; i < h; i++) {
                var row = image[i];
	        for (var j = 0; j < w; j++) {
                    var v = row[j];
                    data[index] = v;
                    data[index+1] = v;
                    data[index+2] = v;
                    data[index+3] = 255;
                    index += 4;
                }
            }
        }
        c.putImageData(imageData, 0,0);
        canvas.imageData = imageData;
        return canvas;
    };

    /*
     * Mat
     */

    // Allocate a w x h sized 2DArray filled by value.
    // args: w(int): width, h(int): height, value(float): initial value
    im.createMat = function(w, h, value) {
        var out = [];
        for (var i = 0; i < h; i++) {
            var row = out[i] = [];
            for (var j = 0; j < w; j++) {
                row[j] = value;
            }
        }
        return out;
    };
    // clone matrix
    // args: mat(2DArray): input, ?out(2DArray): output
    im.clone = function(mat, out) {
        var w = mat[0].length,
            h = mat.length;
        out = out || im.zeros(w, h);
        for (var i = 0; i < h; i++) {
            var inputRow = mat[i];
            var row = out[i];
            for (var j = 0; j < w; j++) {
                row[j] = inputRow[j];
            }
        }
        return out;
    };
    // alloc matrix initialized by zeros
    // args: w(int): width, h(int): height
    im.zeros = function(w, h) {
        return im.createMat(w, h, 0);
    };

    // mask mat (mat1 if mat2 != 0; 0 otherwise)
    // args: mat1(2DArray): input, mat2(2DArray): mask
    // sample: mat, binary
    im.mask = function(mat1, mat2) {
        var w = mat1[0].length,
            h = mat1.length;
        var out = [];
        for (var i = 0; i < h; i++) {
            var inputRow1 = mat1[i],
                inputRow2 = mat2[i];
            var row = out[i] = [];
            for (var j = 0; j < w; j++) {
                row[j] = inputRow2[j] !== 0 ? inputRow1[j] : 0;
            }
        }
        return out;
    };
    // add matrices
    // args: mat1(2DArray): input, mat2(2DArray/float): input, ?out(2DArray): output
    im.add = function(mat1, mat2, out) {
        var w = mat1[0].length,
        h = mat1.length;
        out = out || [];
        if (typeof mat2 === "object") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i],
                inputRow2 = mat2[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] + inputRow2[j];
                }
            }
        }
        else if (typeof mat2 === "number") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] + mat2;
                }
            }
        }
        return out;
    };

    // sub matrices
    // args: mat1(2DArray): input, mat2(2DArray/float): input, ?out(2DArray): output
    im.sub = function(mat1, mat2, out) {
        var w = mat1[0].length,
        h = mat1.length;
        out = out || [];
        if (typeof mat2 === "object") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i],
                inputRow2 = mat2[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] - inputRow2[j];
                }
            }
        }
        else if (typeof mat2 === "number") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] - mat2;
                }
            }
        }
        return out;
    };

    // multiply matrices
    // args: mat1(2DArray): input, mat2(2DArray/float): input, ?out(2DArray): output
    im.multiply = function(mat1, mat2, out) {
        var w = mat1[0].length,
        h = mat1.length;
        out = out || [];
        if (typeof mat2 === "object") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i],
                inputRow2 = mat2[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] * inputRow2[j];
                }
            }
        }
        else if (typeof mat2 === "number") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] * mat2;
                }
            }
        }
        else {
            console.log("not implemented");
        }
        return out;
    };
    im.multiple = im.multiply;

    // divide matrices
    // args: mat1(2DArray): input, mat2(2DArray/float): input, ?out(2DArray): output
    im.divide = function(mat1, mat2) {
        var w = mat1[0].length,
        h = mat1.length;
        var out = [];
        if (typeof mat2 === "object") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i],
                inputRow2 = mat2[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] / inputRow2[j];
                }
            }
        }
        else if (typeof mat2 === "number") {
            for (var i = 0; i < h; i++) {
                var inputRow1 = mat1[i];
                var row = out[i] = [];
                for (var j = 0; j < w; j++) {
                    row[j] = inputRow1[j] / mat2;
                }
            }
        }
        else {
            console.log("not implemented");
        }
        return out;
    };

    im.norm_minmax = 0;
    im.norm_l1 = 1;
    im.norm_l2 = 2;
    // normalize the matrix (type: norm_minmax, norm_l1, norm_l2)
    // args: mat(2DArray): input, a(float): norm value, type(int): normalization type, ?out(2DArray): output
    // sample: mat, 127, im.norm_minmax
    im.normalize = function(mat, a, type, out) {
        var i, j;
        var w = mat[0].length,
        h = mat.length;
        out = out || im.zeros(w, h);
        if (type === im.norm_minmax) {
        	var min = im.min(mat);
            var max = im.max(mat);
            console.log(min + " " + max);
            max -= min;
            im.sub(mat, min, out);
            im.multiply(out, a/max, out);
        }
        else if (type === im.norm_l1) {
            var sum = im.sum(mat);
            im.multiply(mat, a/sum, out);
        }
        else if (type === im.norm_l2) {
            console.log("not implemented");
        }
        return out;
    };

    // return the sum of the matrix
    // args: mat(2DArray): input
    im.sum = function(mat) {
        var i, j;
        var w = mat[0].length,
        h = mat.length;
        var m = 0;
        for (i = 0; i < h; i++) {
            var row = mat[i];
            for (var j = 0; j < w; j++) {
                m += row[j];
            }
        }
        return m;
    };

    // return the minimum value of the matrix
    // args: mat(2DArray): input
    im.min = function(mat) {
        var i, j;
        var w = mat[0].length,
        h = mat.length;
        var m = Number.POSITIVE_INFINITY;
        for (i = 0; i < h; i++) {
            var v = Math.min.apply(null, mat[i]);
            if (v < m) {
                m = v;
            }
        }
        return m;
    };

    // return the maximum value of the matrix
    // args: mat(2DArray): input
    im.max = function(mat) {
        var i, j;
        var w = mat[0].length,
        h = mat.length;
        var m = Number.NEGATIVE_INFINITY;
        for (i = 0; i < h; i++) {
            var v = Math.max.apply(null, mat[i]);
            if (v > m) {
                m = v;
            }
        }
        return m;
    };

    // translate values using look-up table
    // args: mat(2DArray): input, lut(Array): look-up table, ?out(2DArray): output
    // sample: mat, im.calcContrastLUT(6.0)
    im.lut = function(mat, lut, out) {
        var i, j;
        var w = mat[0].length,
            h = mat.length;
        out = out || im.zeros(w, h);
        var mx = lut.length -1;
        for (i = 0; i < h; i++) {
            var row = mat[i];
            for (j = 0; j < w; j++) {
                var v = row[j] |0;
                if (v > mx) v = mx;
                else if (v < 0) v = 0;
                out[i][j] = lut[v];
            }
        }
        return out;
    };

    // calculate the look-up table for contrast adjustment
    // args: a(float): input gain value of the sigmoid function
    im.calcContrastLUT = function(a) {
        var lut = [];
        for (var i = 0; i < 256; i++)
            lut[i] = 255.0 / (1+Math.exp(-a*(i-128)/255)) |0;
        return lut;
    };

    // calculate the look-up table for Gamma correction
    // args: gamma(float): input gamma value
    im.calcGammaLUT = function(gamma) {
        var lut = [];
        var gm = 1.0 / gamma;
        for (var i = 0; i < 256; i++)
            lut[i] = Math.pow(1.0*i/255, gm) * 255 |0;
        return lut;
    };

    im.rgb2hsv = function() {
        // http://stackoverflow.com/questions/8022885
        var rr, gg, bb,
        r = arguments[0] / 255,
        g = arguments[1] / 255,
        b = arguments[2] / 255,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };

        if (diff == 0) {
            h = s = 0;
        } else {
            s = diff / v;
            rr = diffc(r);
            gg = diffc(g);
            bb = diffc(b);

            if (r === v) {
                h = bb - gg;
            }else if (g === v) {
                h = (1 / 3) + rr - bb;
            }else if (b === v) {
                h = (2 / 3) + gg - rr;
            }
            if (h < 0) {
                h += 1;
            }else if (h > 1) {
                h -= 1;
            }
        }
        return [
            Math.round(h * 360),
            Math.round(s * 255),
            Math.round(v * 255)
        ];
    };
    im.hsv2rgb = function (hh, ss, vv) {
        // http://level0.kayac.com/#!2008/06/rgbhsvcmyk.php
        hh = Math.min(Math.max(hh, 0), 360);
        if (hh == 360) {
            hh = 0;
        }

        ss = Math.min(Math.max(ss, 0), 255) / 255;
        vv = Math.min(Math.max(vv, 0), 255) / 255;

        var rr;
        var gg;
        var bb;

        if (ss === 0) {
            rr = vv; gg = vv; bb = vv;
        } else {
            var hi = Math.floor((hh / 60) % 6);
            var ff = (hh / 60) -   hi;
            var pp = vv * (1- ss);
            var qq = vv * (1- ff * ss);
            var tt = vv * (1 - (1 - ff) * ss);

            switch (hi) {
            case 0:
                rr = vv; gg = tt; bb = pp; break;
            case 6:
                rr = vv; gg = 0; bb = pp; break;
            case 1:
                rr = qq; gg = vv; bb = pp; break;
            case 2:
                rr = pp; gg = vv; bb = tt; break;
            case 3:
                rr = pp; gg = qq; bb = vv; break;
            case 4:
                rr = tt; gg = pp; bb = vv; break;
            case 5:
                rr = vv; gg = pp; bb = qq; break;
            default:
                console.log("error"); break;
            }
        }

        return [Math.floor(rr * 255), Math.floor(gg * 255), Math.floor(bb * 255)];
    };
    function _rgb2lab_f(t) {
        if (t > 0.008856451679) return Math.pow(t, 1/3);
        return ( 1.0 / 3.0 ) * ( 29.0 / 6.0 ) * ( 29.0 / 6.0 ) * t + 4.0 / 29.0;
    }
    im.rgb2lab = function(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var x = 0.4124*r + 0.3576*g + 0.1805*b;
        var y = 0.2126*r + 0.7152*g + 0.0722*b;
        var z = 0.0193*r + 0.1192*g + 0.9505*b;
        var yy = _rgb2lab_f(y);

        return [
            (116*yy - 16),
            (500*(_rgb2lab_f(x/0.9505) - yy)),
            (200*(yy - _rgb2lab_f(z/1.0890)))
        ];

        return [
            (116*yy - 16) * 2.55,
            ((500*(_rgb2lab_f(x/0.9505) - yy))+0.86)/(0.86+0.98)*255,
            ((200*(yy - _rgb2lab_f(z/1.0890)))+1.07)/(1.07+0.94)*255
        ];
    };
    im.lab2rgb = function(l, a, b) {
        //l = l / 2.55; a = a/255*(0.86+0.98)-0.86; b = b/255*(1.07+0.94)-1.07;
        var fy = ( l + 16 ) / 116;
        var fx = fy + a / 500;
        var fz = fy - b / 200;

        var squiggle = 6.0 / 29;
        var ss3 = 3 * squiggle * squiggle;
        var X, Y, Z;
        if ( fy > squiggle ) {
            Y = fy * fy * fy;
        } else {
            Y = ( fy - 16.0 / 116 ) * ss3;
        }

        if ( fx > squiggle ) {
            X = 0.9505 * fx * fx * fx;
        } else {
            X = ( fx - 16.0 / 116 ) * ss3 * 0.9505;
        }

        if ( fz > squiggle ) {
            Z = 1.0890 * fz * fz * fz;
        } else {
            Z = ( fz - 16.0 / 116 ) * ss3 * 1.0890;
        }

        var r =  3.2410 * X - 1.5374 * Y - 0.4986 * Z;
        var g = -0.9692 * X + 1.8760 * Y + 0.0416 * Z;
        b =  0.0556 * X - 0.2040 * Y + 1.0570 * Z;

        return [
            r*255|0, g*255|0, b*255|0
        ];
    };

    im.GRAY = 0;
    im.RGB = 1;
    im.HSV = 2;
    im.Lab = 3;
    im.Channels = function(array, w, h, type) {
        this.type = type;
        this[0] = array[0];
        this[1] = array[1];
        this[2] = array[2];
        this.w = w;
        this.h = h;
    };

    // returns the color transform function
    // args: from(int): input color space, to(int): destinate color space
    // sample: im.RGB, im.Lab| alert((out)(127, 0, 0))
    im.getColorFunction = function(from, to) {
        if (from === im.RGB) {
            if (to === im.HSV) return im.rgb2hsv;
            if (to === im.Lab) return im.rgb2lab;
        }
        else if (from === im.HSV) {
            if (to === im.RGB) return im.hsv2rgb;
        }
        else if (from === im.Lab) {
            if (to === im.RGB) return im.lab2rgb;
        }
        return function() { return 127; };
    };
    im.Channels.prototype.cvtColor = function(type, image) {
    // convert rgb to hsv
    // args: red(int): red value, green(int): green value, blue(int): blue value
        var w  =this.w, h = this.h;
        if (this.type === im.RGB) {
            if (type === im.GRAY) {
                var out = image || im.zeros(w, h);
                for (var i = 0; i < h; i++) {
                    var row = out[i];
	            for (var j = 0; j < w; j++) {
                        row[j] = 0.3 * this[0][i][j] + 0.59 * this[1][i][j] + 0.11 * this[2][i][j];
                    }
                }
                return out;
            }
            else if (type === im.HSV || type === im.Lab) {
                var func = im.getColorFunction(this.type, type);
                var out1 = image ? image[0]: im.zeros(w, h);
                var out2 = image ? image[1]: im.zeros(w, h);
                var out3 = image ? image[2]: im.zeros(w, h);
                for (var i = 0; i < h; i++) {
                    var row1 = out1[i];
                    var row2 = out2[i];
                    var row3 = out3[i];
	            for (var j = 0; j < w; j++) {
                        var color = func(this[0][i][j], this[1][i][j], this[2][i][j]);
                        row1[j] = color[0];
                        row2[j] = color[1];
                        row3[j] = color[2];
                    }
                }
                if (image) {
                    image.type = type;
                    return image;
                }
                return im.merge([out1, out2, out3], type);
            }
        }
        if (this.type === im.HSV || this.type === im.Lab) {
            if (type === im.RGB) {
                var func = im.getColorFunction(this.type, type);
                var out1 = image ? image[0]: im.zeros(w, h);
                var out2 = image ? image[1]: im.zeros(w, h);
                var out3 = image ? image[2]: im.zeros(w, h);
                for (var i = 0; i < h; i++) {
                    var row1 = out1[i];
                    var row2 = out2[i];
                    var row3 = out3[i];
                    var inputRows = [this[0][i], this[1][i], this[2][i]];
                    for (var j = 0; j < w; j++) {
                        var color = func(inputRows[0][j], inputRows[1][j], inputRows[2][j]);
                        row1[j] = color[0];
                        row2[j] = color[1];
                        row3[j] = color[2];
                    }
                }
                if (image) {
                    image.type = type;
                    return image;
                }
                else return im.merge([out1, out2, out3], type);
            }
        }
        console.log("not implemented");
        return undefined;
    };

    // 3 mat -> mat[RGB]
    // args: array(Array): 3 2DArray, type(int): color type
    im.merge = function(array, type) {
        var w, h;
        for (var i = 0; i < array.length; i++) {
            if (!array[i]) continue;
            w = array[i][0].length;
            h = array[i].length;
            break;
        }
        return new im.Channels(array, w, h, type);
    };



    /*
     * 2D filters
     */

    im.thresh_binary = 0;
    im.thresh_to_zero = 1;
    im.thresh_inv_binary = 2;
    im.thresh_otsu = 3;

    // threshold (type: thresh_binary, thresh_to_zero, thresh_inv_binary, thresh_otsu)
    // args: image(2DArray): input, value(float): threshold, maxValue(float): max value of the image, type(int): threshold type
    // sample: mat, 0, 255, im.thresh_otsu
    im.threshold = function(image, value, maxValue, type) {
        var i, j;
        var w = image[0].length,
        h = image.length;
        var inputRow, row;
        var out = im.zeros(w, h);
        if (type == im.thresh_binary) {
            for (i = 0; i < h; i++) {
                inputRow = image[i];
                row = out[i];
                for (j = 0; j < w; j++) {
                    if (inputRow[j] > value) row[j] = maxValue;
                }
            }
        }
        else if (type == im.thresh_inv_binary) {
            for (i = 0; i < h; i++) {
                inputRow = image[i];
                row = out[i];
                for (j = 0; j < w; j++) {
                    if (inputRow[j] <= value) row[j] = maxValue;
                }
            }
        }
        else if (type == im.thresh_to_zero) {
            for (i = 0; i < h; i++) {
                inputRow = image[i];
                row = out[i];
                for (j = 0; j < w; j++) {
                    var v = inputRow[j];
                    if (v > value) row[j] = v;
                }
            }
        }
        else if (type == im.thresh_otsu) {
            var hist = im.calcHist(image);
            var n1 = 0, n2 = w * h;
            value = 0;
            var a = 0, m1 = 0, m2 = 0;
            for (i = 0; i < 256; i++) {
            	m2 += hist[i] * i;
            }
            for (i = 0; i < 256; i++) {
            	var n = hist[i];
                n1 += n;
                n2 -= n;
                var m = n * i;
                m1 += m;
                m2 -= m;
                if (n1 === 0 || n2 === 0) continue;
                var mean1 = m1 / n1;
                var mean2 = m2 / n2;
                var a0 = n1 * n2 * Math.pow(mean1 - mean2, 2);
                if (a < a0) {
                	value = i; a = a0;
                }
            }
            for (i = 0; i < h; i++) {
                inputRow = image[i];
                row = out[i];
                for (j = 0; j < w; j++) {
                    var v = inputRow[j];
                    if (v > value) row[j] = maxValue;
                }
            }
        }
        return out;
    };

    // apply Sobel filter
    // args: image(2DArray): input, dx(int): order of the derivative x, dy(int): order of the derivative y, ?out(2DArray): output
    // sample: mat, 1, 0| im.normalize(out, 255, im.norm_minmax)
    im.Sobel = function(image, dx, dy, out) {
        var i, j;
        var w = image[0].length,
        h = image.length;
        out = out || im.zeros(w, h);
        var row, inputRow;
        var prevRow = image[0],
        currentRow = image[1],
        nextRow = image[2];
        if (dx === 1 && dy === 0) {
            for (j = 0; j < w; j++) out[0][j] = 2 * image[0];
            for (j = 0; j < w; j++) out[h-1][j] = 2 * image[h-1];
            for (i = 1; i < h-1; i++) {
                row = out[i];
                for (j = 0; j < w; j++) {
                    row[j] = prevRow[j] + 2 * currentRow[j] + nextRow[j];
                }
	        prevRow = currentRow;
    	        currentRow = nextRow;
                nextRow = image[i+2];
            }
            for (i = 0; i < h; i++) {
                inputRow = image[i];
                row = out[i];
                row[0] = 0;
                for (j = 1; j < w-1; j++) {
                    row[j] = -inputRow[j-1] + inputRow[j+1];
                }
                row[w-1] = 0;
            }
        }
        else if (dx === 0 && dy === 1) {
            for (i = 0; i < h; i++) {
                inputRow = image[i];
                row = out[i];
                row[0] = 2 * inputRow[0];
                for (j = 1; j < w-1; j++) {
                    row[j] = inputRow[j-1] + 2 * inputRow[j] + inputRow[j+1];
                }
                row[w-1] = 2 * inputRow[w-1];
            }
            for (j = 0; j < w; j++) out[0][j] = out[h-1][j] = 0;
            for (i = 1; i < h-1; i++) {
                row = out[i];
                for (j = 0; j < w; j++) {
                    row[j] = -prevRow[j] + nextRow[j];
                }
	        prevRow = currentRow;
    	        currentRow = nextRow;
        	nextRow = image[i+2];
            }
        }
        else {
            console.log("not implemented");
        }
        return out;
    };

    // apply 3x3 Laplacian filter
    // args: image(2DArray): input, ?out(2DArray): output
    // sample: mat| im.normalize(out, 255, im.norm_minmax)
    im.Laplacian = function(image, out) {
        var w = image[0].length,
            h = image.length;
        out = out || im.zeros(w, h);
        image = im.createBorder(image, 1);
        var prevRow = image[0],
            currentRow = image[1],
            nextRow = image[2];
        var buf = 0;
        for (var i = 0; i < h; i++) {
            var row = out[i];
            for (var j = 0; j < w; j++) {
                buf += - prevRow[j] - prevRow[j+1] - prevRow[j+2];
                buf += - currentRow[j] + 8*currentRow[j+1] - currentRow[j+2];
                buf += - nextRow[j] - nextRow[j+1] - nextRow[j+2];
                row[j] = buf;
                buf = 0;
            }
            prevRow = currentRow;
            currentRow = nextRow;
            nextRow = image[i+3];
        }
        return out;
    };

    // Apply a function to matrix or Channels
    // args: image(2DArray/Channels): input, func(Function): get pixel value as a parameter, and return a new value, ?out(2DArray): output
    // sample: mat, function(p) { return p <= 80 ? p+60 : p }
    im.applyFunction = function(mat1, func, out) {
        var w, h;
        var row, inputRow1, inputRow2, inputRow3;
        if (mat1.type) {
            w = mat1.w; h = mat1.h;
            out = out || im.zeros(w, h);
            for (var i = 0; i < h; i++) {
                inputRow1 = mat1[0] ? mat1[0][i] : undefined;
                inputRow2 = mat1[1] ? mat1[1][i] : undefined;
                inputRow3 = mat1[2] ? mat1[2][i] : undefined;
                row = out[i];
                for (var j = 0; j < w; j++) {
                    row[j] = func(
                        inputRow1 ? inputRow1[j] : undefined,
                        inputRow2 ? inputRow2[j] : undefined,
                        inputRow3 ? inputRow3[j] : undefined
                    );
                }
            }
        } else {
            w = mat1[0].length; h = mat1.length;
            out = out || im.zeros(w, h);
            for (var i = 0; i < h; i++) {
                inputRow1 = mat1[i];
                row = out[i];
                for (var j = 0; j < w; j++) {
                    row[j] = func(inputRow1[j]);
                }
            }
        }
        return out;
    };

    // apply 3x3 box filter
    // args: image(2DArray): input, ?out(2DArray): output
    // sample: mat
    im.blur = function(image, out) {
        var w = image[0].length,
            h = image.length;
        out = out || im.zeros(w, h);
        image = im.createBorder(image, 1);
        var prevRow = image[0],
            currentRow = image[1],
            nextRow = image[2];
        var buf = 0;
        for (var i = 0; i < h; i++) {
            var row = out[i];
            for (var j = 0; j < w; j++) {
                var mn = j, mx = j+2;
                for (var p = mn; p <= mx; p++) {
                    buf += prevRow[p];
                }
                for (var p = mn; p <= mx; p++) {
                    buf += currentRow[p];
                }
                for (var p = mn; p <= mx; p++) {
                    buf += nextRow[p];
                }
                row[j] = buf / 9;
                buf = 0;
            }
            prevRow = currentRow;
            currentRow = nextRow;
            nextRow = image[i+3];
        }
        return out;
    };

    // apply 3x3 gaussian filter
    // args: image(2DArray): input, ?out(2DArray): output
    // sample: mat
    im.GaussianBlur = function(image, out) {
        var w = image[0].length,
            h = image.length;
        out = out || im.zeros(w, h);
        image = im.createBorder(image, 1);
        var prevRow = image[0],
            currentRow = image[1],
            nextRow = image[2];
        var buf = 0;
        for (var i = 0; i < h; i++) {
            var row = out[i];
            for (var j = 0; j < w; j++) {
                buf += prevRow[j] + 2*prevRow[j+1] + prevRow[j+2];
                buf += 2*(currentRow[j] + 2*currentRow[j+1] + currentRow[j+2]);
                buf += nextRow[j] + 2*nextRow[j+1] + nextRow[j+2];
                row[j] = buf / 16;
                buf = 0;
            }
            prevRow = currentRow;
            currentRow = nextRow;
            nextRow = image[i+3];
        }
        return out;
    };


    im.morphorogy = function(image, func, f) {
        var i, j, k, l;
        var w = image[0].length, h = image.length;

        var out = im.zeros(w, h);;
        image = im.createBorder(image, 1);
        for (i = 0; i < h; i++) {
            for (j = 0; j < w; j++) {
                var flag = false;
                for (k = 0; k <= 2 && !flag; k ++) {
                    for (l = 0; l <= 2; l ++) {
                        if (func(image[i+k][j+l])) {
                            flag = true;
                            break;
                        }
                    }
                }
                if (flag == f) continue;
                out[i][j] = 255;
            }
        }
        return out;
    };
    // dilate
    // args: image(2DArray): input, iterations(int): number of times
    // sample: binary, 1
    im.dilate = function(image, iterations) {
        iterations = iterations | 1;
        for (; iterations > 0; iterations--)
            image = im.morphorogy(image, function(p) {return p !== 0;}, false);
        return image;
    };
    // erode
    // args: image(2DArray): input, iterations(int): number of times
    // sample: binary, 1
    im.erode = function(image, iterations) {
        iterations = iterations | 1;
        for (; iterations > 0; iterations--)
            image = im.morphorogy(image, function(p) {return p === 0;}, true);
        return image;
    };

    // create n width borders
    // args: image(2DArray): input, n(int): border width
    // sample: mat, 10
    im.createBorder = function(image, n) {
        // TODO create the left and right borders, and then unshift and push
        var w = image[0].length,
        h = image.length;
        var ow = w+n+n,
        oh = h+n+n;
        var out = im.zeros(ow, oh);
        for (var i = 0; i < oh; i++) {
            var i0 = ((i < n) ? n-i : (i >= h+n) ? 2*h+n-i-2 : i-n);
	    for (var j = 0; j < ow; j++) {
	        var j0 = ((j < n) ? n-j : (j >= w+n) ? 2*w+n-j-2 : j-n);
                out[i][j] = image[i0][j0];
            }
        }
        return out;
    };


    // Distance Transform
    // args: image(2DArray): input
    // sample: binary| im.normalize(out, 255, im.norm_minmax)
    im.distTransform = function(image) {
        function min(x, y, z) {
            return Math.min(x, Math.min(y, z));
        }
        var w = image[0].length, h = image.length;
        var maxDist = Math.max(w, h);
        var dist = [];
        for (var i = 0; i < h; i++) {
            var row = [];
            for (var j = 0; j < w; j++) {
                if (image[i][j] !== 0)
                    row[j] = 0;
                else
                    row[j] = maxDist;
            }
            dist[i] = row;
        }

        var distTmp = [];
        for (var i = 0; i < h; i++) {
            distTmp[i] = [];
            for (var j = 0; j < w; j++) {
                distTmp[i][j] = min(
                    dist[i][j],
                    i>0 ? distTmp[i-1][j]+1 : maxDist,
                    j>0 ? distTmp[i][j-1]+1 : maxDist
                );
            }
        }
        var countH = h-1, countW = w-1;
        for (var i = countH; i >= 0; i--) {
            for (var j = countW; j >= 0; j--) {
                dist[i][j] = min(
                    distTmp[i][j],
                    i<countH ? dist[i+1][j]+1 : maxDist,
                    j<countW ? dist[i][j+1]+1 : maxDist
                );
            }
        }
        return dist;
    };



    /*
     * Feature Detection
     */

    // Harris Corner Detection
    // args: image(2DArray): input, ?kernelSize(int): neighborhood size, ?kp(float): free parameter, ?minH(float): minimum H value
    // sample: mat, 7, 0.0008, 10000
    im.detectCorners = function(image, kernelSize, kp, minH) {
        var w = image[0].length,
        h = image.length;
        kernelSize = kernelSize>0 ? kernelSize : 7;
        kp = kp>0 ? kp : 0.0008;
        minH = minH>0 ? minH : 10000;

        var dx = im.Sobel(image, 1, 0),
        dy = im.Sobel(image, 0, 1);

        var dxdx = im.blur(im.multiple(dx, dx)),
        dydy = im.blur(im.multiple(dy, dy)),
        dxdy = im.blur(im.multiple(dx, dy));

        var H = im.zeros(w, h);
        for (var i = 0; i < h; i++) {
            var xxRow = dxdx[i],
            yyRow = dydy[i],
            xyRow = dxdy[i];
            var row = H[i];
	    for (var j = 0; j < w; j++) {
                var xx = xxRow[j],
                yy = yyRow[j],
                xy = xyRow[j],
                trace = xx + yy;
		row[j] = xx*yy - xy*xy - kp*trace*trace;
            }
        }
        H = im.threshold(H, minH, 255, im.thresh_to_zero);

        // non-maximum suppression
        var out = im.zeros(w, h);
        var k = Math.floor(kernelSize/2);
        for (var i = k; i < h-k; i++) {
	    for (var j = k; j < w-k; j++) {
                var v = H[i][j];
                if (v <= 0) continue;
                var flag = true;
		for (var p = -k; p <= k && flag; p++) {
                    var y = i+p;
                    // if (y < 0 || y >= h) continue;
		    for (var q = -k; q <= k; q++) {
                        if (q === 0 && p === 0) continue;
                        var x = j+q;
                        // if (x < 0 || x >= w) continue;
                        if (v <= H[y][x]) {
                            flag = false;
                            break;
                        }
	            }
                }
                if (flag) {
                    // local maximum
                    out[i][j] = 255;
                }
            }
        }

        return out;
    };

    // Canny Edge Detection
    // args: image(2DArray): input, lt(int): lower threshold, ht(int): higher threshold
    // sample: mat, 12, 20
    im.detectEdges = function(image, lt, ht) {
        var w = image[0].length,
        h = image.length;

        var dx = im.Sobel(image, 1, 0),
        dy = im.Sobel(image, 0, 1);
        var dyx = new im.Channels([dy, dx], w, h, im.RGB);
        var magnitude, angle;

        angle = im.applyFunction(im.divide(dy, dx), Math.atan);
        magnitude = im.applyFunction(dyx, function(dy, dx) { return Math.sqrt(dx*dx+dy*dy); });

        var out = im.zeros(w, h);
        var k = 1;
        var mag = magnitude;
        for (var i = k; i < h-k; i++) {
            var aRow = angle[i], mRow = magnitude[i];
	    for (var j = k; j < w-k; j++) {
                var a = aRow[j],
                m = mRow[j];
                var flag = false;
                if (-0.3742 < a && a <= 0.3742) {
                    // 90 deg
                    aRow[j] = 90;
                    flag = (m >= mag[i][j-1] && m >= mag[i][j+1]);
                }
                else if (0.3742 < a && a <= 0.8670) {
                    // 45 deg
                    aRow[j] = 45;
                    flag = (m >= mag[i-1][j-1] && m >= mag[i+1][j+1]);
                }
                else if (-0.8670 < a && a <= -0.3742) {
                    // 135 deg
                    aRow[j] = 135;
                    flag = (m >= mag[i+1][j-1] && m >= mag[i-1][j+1]);
                }
                else {
                    // 0 deg
                    aRow[j] = 0;
                    flag = (m >= mag[i-1][j] && m >= mag[i+1][j]);
                }
                if (flag) out[i][j] = m;
            }
        }

        var _addEdge = function(x, y, a, count) {
            if (x < 0 || x >= w || y < 0 || y >= h) return;
            var m = out[y][x];
            if (m < lt) return;
            if (m === 256) return;
            if (a !== angle[y][x]) return;

            out[y][x] = 256;
            count ++;
            //if (count > 100) return;

	    for (var i = -1; i <= 1; i++)
		for (var j = -1; j <= 1; j++)
                    if (i !== 0 || j !== 0) _addEdge(x+j, y+i, a, count);
        };
        for (var i = k; i < h-k; i++) {
	    for (var j = k; j < w-k; j++) {
                var m = out[i][j];
                if (m < ht || m === 256) continue;
                _addEdge(j, i, angle[i][j], 0);
            }
        }

        return im.applyFunction(out, function(p) { return (p === 256) ? 255 : 0; });
    };

    im._createShapeContextTable = function(r, distN, angleN) {
        var dr = r / distN, da = 2*Math.PI / angleN;
        var d = [], a = [];
        var idx = -1;
        for (var i = 0; i < r*2; i++) {
	    for (var j = 0; j < r*2; j++) {
                idx ++;
                var dx = r - j, dy = r - i;
                var dist = Math.sqrt(dx*dx + dy*dy);
                if (dist >= r) continue;
                var angle = Math.atan2(dy, dx) + da/2; // [-PI+da/2, PI+da/2]
                angle += Math.PI;
                angle %= 2*Math.PI-da/2;
                d[idx] = (dist / dr) | 0;
                a[idx] = (angle / da) | 0;
            }
        }
        im._shapeContextTable = {dist: d, angle: a};
    };
    // get the shape context feature of the point
    // args: image(2DArray): input, x(int): x, y(int): y, r(int): radius
    im.getShapeContext = function(image, x, y, r) {
        var w = image[0].length,
        h = image.length;
        if (x < r || x >= w-r || y < r || y >= h-r) return [];

        var distN = 10, angleN = 16;

        if (!im._shapeContextTable ||
            im._shapeContextTable.length !== r) im._createShapeContextTable(r, distN, angleN);
        var t = im._shapeContextTable;
        var dist = t.dist, angle = t.angle;

        var out = [], row;
        for (var i = 0; i < distN*angleN; i++) out[i] = 0;

        var idx = -1, count = 0;
        for (var i = 0; i < r*2; i++) {
            row = image[y-r+i];
	    for (var j = 0; j < r*2; j++) {
                idx ++;
                var p = row[x-r+j];
                if (p === 0) continue;
                var d = dist[idx];
                var a = angle[idx];
                if (d >= 0 && a >= 0) {
                    out[d*angleN + a] ++;
                    count ++;
                }
            }
        }
        if (false && count > 0)
            for (var i = 0; i < distN*angleN; i++) out[i] /= count;
        return out;

    };


    /*
     * Clustering
     */

    // Clustering by K-means. Returns Object {centers: 2DArray, centroids: Array, score: float}
    // args: image(2DArray): input, colors(int): the number of colors, iterations(int): count of attempts, replaceColors(bool): replace colors or not
    // sample: mat, 5, 3, true
    im.kmeans = function(image, colors, iterations, replaceColors) {
        var i, j, k;
        var w = image[0].length, h = image.length;

        /*
        // select initial centroids
        (function() {
        var selected = [];
        for (i = 0; i < colors; i++) {
        var idx = -1;
        while (idx < 0 || selected[idx])
        idx = (Math.random() * (w*h)) | 0;
        selected[idx] = true;
        var x = idx % w, y = (idx / w) | 0;
        centroids[i] = image[y][x];
        }
        })();
        */
        var result = {score: -1};
        for (var iter = 0; iter < iterations; iter++) {
            var centers = im.zeros(w, h);
            var centroids = [], ncentroids = [];

            // classify all pixels randomly
            for (i = 0; i < h; i++) {
                for (j = 0; j < w; j++) {
                    centers[i][j] = Math.floor(Math.random() * colors);
                }
            }

            var score;
            var changed = true;
            var map = [];
            while (changed) {
                changed = false;
                score = 0;

                // calculate centroids
                for (i = 0; i < colors; i++) centroids[i] = ncentroids[i] = 0;
                for (i = 0; i < h; i++) {
                    for (j = 0; j < w; j++) {
                        var idx = centers[i][j];
                        centroids[idx] += image[i][j];
                        ncentroids[idx] ++;
                    }
                }
                for (i = 0; i < colors; i++) {
                    if (ncentroids[i] > 0)
                        centroids[i] = Math.round(centroids[i] / ncentroids[i]);
                    else
                        centroids[i] = Math.random() * 256 | 0;
                }

                // create map
                for (i = 0; i < 256; i++) map[i] = -1;
                var loop = 0;
                var conflicts = 0;
                while(conflicts < colors*2 && loop < 255) {
                    conflicts = 0;
                    for (i = 0; i < colors; i++) {
                        var cent = centroids[i];
                        if (cent+loop > 255) conflicts ++;
                        else if (map[cent+loop] === -1) map[cent+loop] = i;
                        else conflicts ++;
                        if (loop === 0) {}
                        else if (cent-loop < 0) conflicts ++;
                        else if (map[cent-loop] === -1) map[cent-loop] = i;
                        else conflicts ++;
                    }
                    loop ++;
                }

                // change the nearest centroid for each pixel
                for (i = 0; i < h; i++) {
                    for (j = 0; j < w; j++) {
                        var v = image[i][j];
                        /*
                        var mndist = -1, mnk;
                        for (k = 0; k < colors; k++) {
                            var dist = Math.abs(centroids[k] - v);
                            if (mndist < 0 || mndist > dist) {
                                mndist = dist;
                                mnk = k;
                            }
                        }
                        */
                        var mnk = map[v|0], mndist = Math.abs(centroids[mnk] - v);
                        score += mndist;
                        if (centers[i][j] === mnk) continue;
                        centers[i][j] = mnk;
                        changed = true;
                    }
                }
            }
            if (result.score < 0 || result.score > score) {
                result.centers = centers;
                result.centroids = centroids;
                result.score = score;
            }
        }
        if (replaceColors) {
            for (i = 0; i < h; i++) {
                for (j = 0; j < w; j++) {
                    result.centers[i][j] = result.centroids[result.centers[i][j]];
                }
            }
            return result.centers;
        }

        // sort centroids
        im.sortWithIndeces(result.centroids);
        var indices = result.centroids.sortIndices;
        var rank = [];
        for (i = 0; i < colors; i++) rank[indices[i]] = i;

/*
        var _centroids = [], _rank = [];
        for (i = 0; i < colors; i++) _centroids[i] = centroids[i];
        _centroids.sort(function (val1, val2){
            return val1 - val2;
        });
        for (i = 0; i < colors; i++) _rank[_centroids[i]] = centroids[i];
*/
        for (i = 0; i < h; i++) {
            for (j = 0; j < w; j++) {
                result.centers[i][j] = rank[result.centers[i][j]];
            }
        }

        return result;
    };

    // draw contours of binary image
    // args: image(2DArray): input
    // sample: binary
    im.drawContours = function(image) {
        var i, j, k;
        var w = image[0].length, h = image.length;
        var out = im.zeros(w, h);
        var prow = image[0];
        for (i = 1; i < h; i++) {
            var row = image[i];
            var prev = row[0];
            for (j = 1; j < w; j++) {
                var v = row[j];
                var pv = prow[j];
                if (prev !== v || pv !== v) out[i][j] = 255;
                prev = v;
            }
            prow = row;
        }
        return out;
    };

    // superpixel
    // args: image(2DArray): input, size(int): size of a superpixel, iterations(int): count of attempts, replaceColors(bool): replace colors or not
    // sample: mat, 16, 1, true
    im.superpixel = function(image, size, iterations, replaceColors) {
        var i, j, k;
        var w, h;
        var dims;
        var maxValue;
        if (image.type) {
            w = image.w;
            h = image.h;
            dims = 5;
            if (image.type === im.Lab) maxValue = [w, h, 100, 10, 10];
            else maxValue = [w, h, (image.type === im.HSV ? 360 : 255), 255, 255];
        }
        else {
            w = image[0].length;
            h = image.length;
            dims = 3;
            maxValue = [w, h, 255];
        }
        var W = (w/size|0)+1, H = (h/size|0)+1;
        var K = W*H;
        var weight;
        if (image.type) {
            weight = [1, 1, 1, 1, 0.5/Math.sqrt(((w*h)/K))];
        }
        else {
            weight = [1, 1, 0.5/Math.sqrt(((w*h)/K))];
        }

        var result = {score: -1};
        for (var iter = 0; iter < iterations; iter++) {
            var centers = im.zeros(w, h);
            var centroids = [], ncentroids = [];

            // select initial centroids
            for (i = 0; i < H; i++) {
                for (j = 0; j < W; j++) {
                    var ind = (i*W+j)*dims;
                    centroids[ind] = j*size;
                    centroids[ind+1] = i*size;
                    centroids[ind+2] = -1;
                    if (dims > 3) {
                        centroids[ind+3] = -1;
                        centroids[ind+4] = -1;
                    }
                }
            }

            for (i = 0; i < h; i++) {
                for (j = 0; j < w; j++) {
                    centers[i][j] = ((i/size|0)*W+(j/size|0));
                }
            }
            // return im.applyFunction(centers, function(p) {return (p*50)%256; });

            var score;
            var counter = 0;
            var changed = 1;
            while (changed) {
                changed = 0;
                score = 0;

                if (counter > 0) {
                    // calculate centroids
                    for (i = 0; i < K; i++) {
                        for (j = 0; j < dims; j++) centroids[i*dims+j] = 0;
                        ncentroids[i] = 0;
                    }
                    for (i = 0; i < h; i++) {
                        for (j = 0; j < w; j++) {
                            k = centers[i][j];
                            var idx = k*dims;
                            centroids[idx] += j;
                            centroids[idx+1] += i;
                            if (dims > 3) {
                                centroids[idx+2] += image[0][i][j];
                                centroids[idx+3] += image[1][i][j];
                                centroids[idx+4] += image[2][i][j];
                            } else {
                                centroids[idx+2] += image[i][j];
                            }
                            ncentroids[k] ++;
                        }
                    }
                    for (i = 0; i < K; i++) {
                        if (ncentroids[i] > 0) {
                            for (j = 0; j < dims; j++) {
                                centroids[i*dims+j] = Math.round(centroids[i*dims+j] / ncentroids[i]);
                                //console.log("+ "+centroids[i*dims+j]);
                            }
                        }
                        else {
                            // centroids[i] = Math.random() * 256 | 0;
                        }
                    }
                    if (counter > 100) break;
                }
                // change the nearest centroid for each pixel

                for (i = 0; i < h; i++) {
                    for (j = 0; j < w; j++) {

                        var prevK = centers[i][j];
                        var prevX = prevK % W;
                        var prevY = prevK / W |0;
                        var mndist = -1, mnk;
                        // search 9 neighborhoods
                        for (k = 0; k < 9; k++) {

                            var p = 0;
                            if (k === 0) p = 0;

                            else if (k === 1 && prevX !== 0) p = -1;
                            else if (k === 2 && prevX !== W-1) p = 1;
                            else if (k === 3 && prevY !== 0) p = -W;
                            else if (k === 4 && prevY !== H-1) p = W;

                            else if (k === 5 && prevX !== 0 && prevY !== 0) p = -W-1;
                            else if (k === 6 && prevX !== W-1 && prevY !== 0) p = -W+1;
                            else if (k === 7 && prevX !== 0 && prevY !== H-1) p = +W-1;
                            else if (k === 8 && prevX !== W-1 && prevY !== H-1) p = +W+1;
                            else continue;

                            var neighbor = prevK + p;
                            var ind = neighbor*dims;
                            var dist = 0;
                            var l;
                            var v;
                            if (dims > 3) {
                                v = [j, i, image[0][i][j], image[1][i][j], image[2][i][j]];
                            }
                            else {
                                v = [j, i, image[i][j]];
                            }
                            var distSP, distCol, d;
                            dist = 0;
                            for (l = 0; l < 2; l++) {
                                d = (centroids[ind+l] - v[l]) / maxValue[l];
                                dist += d * d;
                            }
                            distSP = Math.sqrt(dist) * weight[0];
                            dist = 0;
                            for (; l < dims; l++) {
                                if (maxValue[l] === 360) {
                                    d = Math.abs(centroids[ind+l] - v[l]);
                                    d = (d > 180 ? d - 180 : d) / 180;
                                } else {
                                    d = (centroids[ind+l] - v[l]) / maxValue[l];
                                }
                                dist += d * d;
                            }
                            distCol = Math.sqrt(dist) * weight[dims-1];
                            dist = distSP + distCol;
                            if (mndist < 0 || mndist > dist) {
                                mndist = dist;
                                mnk = neighbor;
                            }
                        }
                        score += mndist;
                        if (centers[i][j] === mnk) continue;
                        centers[i][j] = mnk;
                        changed ++;
                    }
                }
                //console.log(changed);
                if (counter === 0 && changed === 0) changed++;
                counter ++;
            }
            if (result.score < 0 || result.score > score) {
                result.centers = centers;
                result.centroids = centroids;
                result.score = score;
            }
        }
        if (replaceColors) {
            if (dims > 3) {
                var out = new im.Channels([im.zeros(w, h), im.zeros(w, h), im.zeros(w, h)], w, h, image.type);
                for (i = 0; i < h; i++) {
                    for (j = 0; j < w; j++) {
                        var ind = result.centers[i][j]*dims+2;
                        for (k = 0; k < 3; k++)
                            out[k][i][j] = result.centroids[ind+k];
                    }
                }
                return out;
            }
            else {
                for (i = 0; i < h; i++) {
                    for (j = 0; j < w; j++) {
                        result.centers[i][j] = result.centroids[result.centers[i][j]*dims+2];
                    }
                }
                return result.centers;
            }
        }
        return result;
    };



    /*
     * Others
     */
	// write a histogram to console.log
    // args: hist(Array): input
    im.outHist = function(hist) {
        var s = "---\n";
        for (var i = 0; i < hist.length; i++) {
            s += "|";
	    for (var j = 0; j < hist[i]; j++) {
                s += "*";
            }
            s += "\n";
        }
        s += "---";
        console.log(s);
    };


    // sort with indeces
    // args: array(Array): input
    im.sortWithIndeces = function(toSort) {
        // http://stackoverflow.com/questions/3730510/
        for (var i = 0; i < toSort.length; i++) {
            toSort[i] = [toSort[i], i];
        }
        toSort.sort(function(left, right) {
            return left[0] > right[0] ? -1 : 1;
        });
        toSort.sortIndices = [];
        for (var j = 0; j < toSort.length; j++) {
            toSort.sortIndices.push(toSort[j][1]);
            toSort[j] = toSort[j][0];
        }
        return toSort;
    };


    // calculate the 256bins histogram
    // args: image(2DArray): input
    im.calcHist = function(image) {
        var i, j;
        var w = image[0].length, h = image.length;
        var hist = [];
        for (var i = 0; i < 256; i++) hist[i] = 0;
        for (i = 0; i < h; i++) {
            var row = image[i];
            for (j = 0; j < w; j++) {
         		hist[row[j]|0] ++;
            }
        }
        return hist;
    };

})();
