/**
* Copyright 2012-2018, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var volumePlot = require('gl-volume3d');

var simpleMap = require('../../lib').simpleMap;
var parseColorScale = require('../../lib/gl_format_color').parseColorScale;

// var distinctVals = require('../../lib').distinctVals;

function Volume(scene, uid) {
    this.scene = scene;
    this.uid = uid;
    this.mesh = null;
    this.data = null;
}

var proto = Volume.prototype;

// proto.handlePick = function(selection) {
proto.handlePick = function() {
    return false;
};

function parseOpacityScale(opacityScale) {
    var alphaMapLength = 256;
    var alphaMap = new Float32Array(alphaMapLength);
    var alphaMapIndex = 0;
    var previousEntry = [0, 1];
    for(var i = 0; i < opacityScale.length; i++) {
        var entry = opacityScale[i];
        var startIndex = alphaMapIndex;
        var startValue = previousEntry[1];
        var endIndex = Math.max(0, Math.min(Math.floor(entry[0] * alphaMapLength), alphaMapLength - 1));
        var endValue = entry[1];
        var indexDelta = endIndex - startIndex;
        while(alphaMapIndex < endIndex) {
            var t = (alphaMapIndex - startIndex) / indexDelta;
            alphaMap[alphaMapIndex] = (1 - t) * startValue + t * endValue;
            alphaMapIndex++;
        }
        alphaMap[alphaMapIndex] = endValue;
        previousEntry = entry;
    }
    var lastAlpha = alphaMap[alphaMapIndex];
    while(alphaMapIndex < alphaMapLength) {
        alphaMap[alphaMapIndex++] = lastAlpha;
    }
    return alphaMap;
}

var axisName2scaleIndex = {xaxis: 0, yaxis: 1, zaxis: 2};

/*
    Finds the first ascending sequence of unique coordinates in src.
    Steps through src in stride-length steps.

    Useful for creating meshgrids out of 3D volume coordinates.

    E.g.
        getSequence([1,2,3,1,2,3], 1) -> [1,2,3] // steps through the first half of the array, bails on the second 1
        getSequence([1,1,2,2,3,3,1,1,2,2,3,3], 1) -> [1,2,3] // steps through every element in the first half of the array
        getSequence([1,1,2,2,3,3,1,1,2,2,3,3], 2) -> [1,2,3] // skips every other element

        getSequence([1,1,1, 1,1,1, 1,1,1, 2,2,2, 2,2,2, 2,2,2], 9) -> [1,2] // skips from seq[0] to seq[9] to end of array
*/
function getSequence(src, stride) {
    var xs = [src[0]];
    for(var i = 0, last = xs[0]; i < src.length; i += stride) {
        var p = src[i];
        if(p >= last) {
            if(p > last) {
                xs.push(p);
            }
            last = p;
        } else {
            break;
        }
    }
    return xs;
}

function convert(gl, scene, trace) {
    var sceneLayout = scene.fullSceneLayout;
    var dataScale = scene.dataScale;
    var volumeOpts = {};

    function toDataCoords(arr, axisName) {
        var ax = sceneLayout[axisName];
        var scale = dataScale[axisName2scaleIndex[axisName]];
        return simpleMap(arr, function(v) { return ax.d2l(v) * scale; });
    }

    var xs = getSequence(trace.x, 1);
    var ys = getSequence(trace.y, xs.length);
    var zs = getSequence(trace.z, xs.length * ys.length);

    volumeOpts.dimensions = [xs.length, ys.length, zs.length];
    volumeOpts.meshgrid = [
        toDataCoords(xs, 'xaxis'),
        toDataCoords(ys, 'yaxis'),
        toDataCoords(zs, 'zaxis')
    ];

    volumeOpts.values = trace.values;

    volumeOpts.colormap = parseColorScale(trace.colorscale);

    volumeOpts.opacity = trace.opacity;

    if(trace.opacityscale) {
        volumeOpts.alphamap = parseOpacityScale(trace.opacityscale);
    }

    var vmin = trace.vmin;
    var vmax = trace.vmax;

    if(vmin === undefined || vmax === undefined) {
        var minV = trace.values[0], maxV = trace.values[0];
        for(var i = 1; i < trace.values.length; i++) {
            var v = trace.values[i];
            if(v > maxV) {
                maxV = v;
            } else if(v < minV) {
                minV = v;
            }
        }
        if(vmin === undefined) {
            vmin = minV;
        }
        if(vmax === undefined) {
            vmax = maxV;
        }
    }

    volumeOpts.isoBounds = [vmin, vmax];
    volumeOpts.intensityBounds = [trace.cmin, trace.cmax];

    var bounds = [[0, 0, 0], volumeOpts.dimensions];

    var volume = volumePlot(gl, volumeOpts, bounds);

/*

    // pass gl-mesh3d lighting attributes
    var lp = trace.lightposition;
    for(var i = 0; i < volume.meshes.length; i++) {
        var meshData = volume.meshes[i];
        meshData.lightPosition = [lp.x, lp.y, lp.z];
        meshData.ambient = trace.lighting.ambient;
        meshData.diffuse = trace.lighting.diffuse;
        meshData.specular = trace.lighting.specular;
        meshData.roughness = trace.lighting.roughness;
        meshData.fresnel = trace.lighting.fresnel;
        meshData.opacity = trace.opacity;

    }
*/

/*
    // pass gl-mesh3d lighting attributes
    var lp = trace.lightposition;
    // for(var i = 0; i < volume.mesh.length; i++) {
        // var meshData = volume.mesh[i];
        var meshData = volume;

        meshData.lightPosition = [lp.x, lp.y, lp.z];
        meshData.ambient = trace.lighting.ambient;
        meshData.diffuse = trace.lighting.diffuse;
        meshData.specular = trace.lighting.specular;
        meshData.roughness = trace.lighting.roughness;
        meshData.fresnel = trace.lighting.fresnel;
        meshData.opacity = trace.opacity;

    // }
*/
    return volume;
}

proto.update = function(data) {
    this.data = data;

    this.dispose();

    var gl = this.scene.glplot.gl;
    var mesh = convert(gl, this.scene, data);
    this.mesh = mesh;
    this.mesh._trace = this;

    this.scene.glplot.add(mesh);
};

proto.dispose = function() {
    this.scene.glplot.remove(this.mesh);
    this.mesh.dispose();
};

function createVolumeTrace(scene, data) {
    var gl = scene.glplot.gl;

    var mesh = convert(gl, scene, data);

    var volume = new Volume(scene, data.uid);
    volume.mesh = mesh;
    volume.data = data;
    mesh._trace = volume;

    scene.glplot.add(mesh);

    return volume;
}

module.exports = createVolumeTrace;
