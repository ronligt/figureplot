var display = function(canvas, data) {
  var ctx = canvas.getContext("2d");
  var canvasSize = Math.min(canvas.width, canvas.height);

  var imageSize = Math.floor(Math.sqrt(data.length));
  var scale = canvasSize / imageSize;

  // reset canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); // save original canvas

  var lightness;
  var minData, maxData;
  [minData,maxData] = getMinMax(data);

  var lightnessScale = 255 / (maxData - minData);
  var style;
  for (var h = 0; h < imageSize; h++) {
    for (var w = 0; w < imageSize; w++) {
      ctx.beginPath();
      ctx.rect(w * scale, h * scale, scale, scale);
      lightness = Math.floor(data[w + h * imageSize] * lightnessScale);
      style = 'rgb(' + lightness + ', ' + lightness + ', ' + lightness + ')'
      ctx.fillStyle = style;
      ctx.fill();
      ctx.strokeStyle = style
      ctx.stroke();
    }
  }
  ctx.restore();
}

function getMinMax(arr) {
  let min = arr[0], max = arr[0];

  for (let i = 1, len=arr.length; i < len; i++) {
    let v = arr[i];
    min = (v < min) ? v : min;
    max = (v > max) ? v : max;
  }

  return [min, max];
}

function getMinMaxMean(arr) {
  let min = arr[0], max = arr[0], sum = 0;
  let len = arr.length;
  for (let i = 1; i < len; i++) {
    let v = arr[i];
    min = (v < min) ? v : min;
    max = (v > max) ? v : max;
    sum += v;
  }

  return [min, max, mean/len];
}

var findLimits = function(minValue, maxValue) {
  var range = Math.abs(maxValue - minValue);
  if (maxValue >= 0 && minValue < 0) {
    var rangeOrderPlus = Math.floor(Math.log10(maxValue));
    var rangeOrderMin = Math.floor(Math.log10(Math.abs(minValue)));
    var rangeOrder = Math.max(rangeOrderPlus, rangeOrderMin);
  } else {
    var rangeOrder = Math.floor(Math.log10(range));
  }
  return {
    min: Math.floor(minValue / Math.pow(10, rangeOrder - 1)) * Math.pow(10, rangeOrder - 1),
    max: Math.ceil(maxValue / Math.pow(10, rangeOrder - 1)) * Math.pow(10, rangeOrder - 1)
  };
}

var findOptimum = function(range, maxTicks) {
  var rangeOrder = Math.floor(Math.log10(range));
  var range = Math.ceil(range * Math.pow(10, (1 - rangeOrder)));
  var add = maxTicks;
  var rest, base;
  for (var i = maxTicks; i > 1; i--) {
    rest = range % (i - 1);
    if (rest === 0) {
      base = i;
      add = 0;
      break;
    } else {
      if ((i - 1 - rest) < add) {
        base = i;
        add = i - 1 - rest;
        if (add < (0.1 * range)) {
          break;
        }
      }
    }
  }
  return {
    range: (range + add) * Math.pow(10, (rangeOrder - 1)),
    ticks: base
  };
}

var findMinMax = function(minValue, maxValue, maxTicks) {
  var limits = findLimits(minValue, maxValue);
  var range = Math.abs(limits.max - limits.min);
  var optimum = findOptimum(range, maxTicks);
  return {
    min: limits.min,
    max: limits.min + optimum.range,
    range: optimum.range,
    ticks: optimum.ticks,
    ticksDelta: optimum.range / (optimum.ticks - 1)
  };
}

var unwrapSN = function(x, dec) { // return significant numbers
  var data = x.toExponential(dec).split(/e/i);
  return {
    s: Number(data[0]),
    e: Number(data[1])
  };
}

function figure (canvas, xLabel, yLabel, minX, maxX, minY, maxY) {
  // adjustable values
  var margin = 10;
  var fontHeight = parseFloat(window.getComputedStyle(canvas, null).getPropertyValue('font-size'));
  var fontHeight = 14;
  var lineSpacingRate = 0.2;
  var fontSupRate = 0.6;
  var lineSpacing = fontHeight * lineSpacingRate;
  var lineHeight = fontHeight + lineSpacing;
  var fontWidth = fontHeight * 0.8;
  //var tickAmount = 4;
  var tickLength = 7;
  // initialisation
  var ctx = canvas.getContext("2d");
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var plotWidth = Math.floor(canvasWidth - 2 * margin - lineHeight - 3 * fontWidth - 2 * fontWidth);
  var plotHeight = Math.floor(canvasHeight - 2 * margin - 2 * lineHeight - lineHeight);
  var plotOriginColumn = margin + fontHeight + 3 * fontWidth; // canvas coordinates in Columns and Rows
  var plotOriginRow = margin + 2 * lineHeight;

  // reset canvas
  ctx.save(); // original canvas settings
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // plot origin in the bottom left corner
  ctx.translate(plotOriginColumn, canvasHeight - plotOriginRow);

  // draw axis
  ctx.save(); // draw axis
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'black';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(plotWidth, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -plotHeight); // minus y is needed for cartesian
  ctx.stroke();
  ctx.restore(); // draw axis

  // label axis
  ctx.save(); // label axis
  ctx.font = fontHeight.toString().concat("px sans-serif");
  ctx.textAlign = 'center';
  // x-axis
  ctx.fillText(xLabel, Math.floor(plotWidth / 2), 2 * lineHeight);
  // y-axis
  ctx.rotate(3 * Math.PI / 2);
  ctx.fillText(yLabel, Math.floor(plotHeight / 2), -(3 * fontWidth + lineSpacing));
  ctx.restore(); // label axis

  // set x-axis and y-axis to data values
  var tickAmountX = Math.floor(plotWidth / (fontWidth * 4));
  var newX = findMinMax(minX, maxX, tickAmountX);
  minX = newX.min;
  maxX = newX.max;
  tickAmountX = newX.ticks;
  var rangeX = newX.range;
  var tickAmountY = Math.floor(plotHeight / lineHeight);
  var newY = findMinMax(minY, maxY, tickAmountY);
  minY = newY.min;
  maxY = newY.max;
  tickAmountY = newY.ticks;
  var rangeY = newY.range;
  var scaleX = plotWidth / rangeX;
  var scaleY = -plotHeight / rangeY; // note the minus!!!

  // set plotting to data values
  ctx.translate(-minX * scaleX, -minY * scaleY);

  // set ticks on x-axis
  ticksOnAxis("x", 3);

  // draw x=0
  if (minX < 0 && maxX > 0) {
    ctx.save(); // draw x=0
    ctx.strokeStyle = 'grey';
    ctx.setLineDash([1, 1]);
    ctx.beginPath();
    ctx.moveTo(0, minY * scaleY);
    ctx.lineTo(0, maxY * scaleY);
    ctx.stroke();
    ctx.restore(); // draw x=0
  }

  // set ticks on y-axis
  ticksOnAxis("y", 3);

  // draw y=0
  if (minY < 0 && maxY > 0) {
    ctx.save(); // draw y=0
    ctx.strokeStyle = 'grey';
    ctx.setLineDash([1, 1]);
    ctx.beginPath();
    ctx.moveTo(minX * scaleX, 0);
    ctx.lineTo(maxX * scaleX, 0);
    ctx.stroke();
    ctx.restore(); // draw y=0
  }

  ctx.restore(); // original canvas settings

  return {
    ctx: ctx,
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight,
    plotWidth: plotWidth,
    plotHeight: plotHeight,
    plotOriginColumn: plotOriginColumn,
    plotOriginRow: plotOriginRow,
    minX: minX,
    maxX: maxX,
    minY: minY,
    maxY: maxY,
    scaleX: scaleX,
    scaleY: scaleY
  };

  function ticksOnAxis(axis, maxLength) {
    var bigValue, tickDelta;
    if (axis === "x") {
      bigValue = Math.max(Math.abs(minX), Math.abs(maxX));
      tickDelta = newX.ticksDelta;
    } else {
      bigValue = Math.max(Math.abs(minY), Math.abs(maxY));
      tickDelta = newY.ticksDelta;
    }
    var m = unwrapSN(bigValue).e;
    var l = unwrapSN(tickDelta).e;
    var bound = maxLength - 1 - (m < maxLength ? Math.max(m, 0) : 0);
    var expOn = false;
    var fix;
    if (m >= maxLength || (m == -(maxLength - 1) && l < -maxLength) || m <= -maxLength) {
      expOn = true;
      ctx.save(); // exp for axis
      ctx.font = fontHeight.toString().concat("px sans-serif");
      ctx.textAlign = 'left';
      if (axis === "x") {
        ctx.fillText("x10", maxX * scaleX, minY * scaleY + 2 * lineHeight);
      } else {
        ctx.fillText("x10", minX * scaleX, maxY * scaleY - 2 * lineSpacing);
      }
      ctx.font = (fontHeight * fontSupRate).toString().concat("px sans-serif");
      if (axis === "x") {
        ctx.fillText(m, maxX * scaleX + 2.1 * fontWidth, minY * scaleY + 2 * lineHeight - fontHeight * fontSupRate);
      } else {
        ctx.fillText(m, minX * scaleX + 2.1 * fontWidth, maxY * scaleY - lineSpacing - 1.2 * fontHeight * fontSupRate);
      }
      ctx.restore(); // exp for y-axis
      fix = Math.min(Math.abs(m - l), bound);
    } else {
      if (m >= 0 && m == l) {
        fix = 0;
      } else {
        fix = Math.min(Math.abs(l), bound);
      }
    }
    ctx.save(); // tick marks and labels y-axis
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.setLineDash([]);
    ctx.font = fontHeight.toString().concat("px sans-serif");
    var tickAmount;
    if (axis === "x") {
      ctx.textAlign = 'center';
      tickAmount = tickAmountX;
    } else {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      tickAmount = tickAmountY;
    }
    var tickValue, label, sn;
    for (var i = 0; i < tickAmount; i++) {
      if (axis === "x") {
        tickValue = minX + i * tickDelta;
      } else {
        tickValue = minY + i * tickDelta;
      }
      ctx.beginPath();
      if (axis === "x") {
        ctx.moveTo(tickValue * scaleX, minY * scaleY);
        ctx.lineTo(tickValue * scaleX, minY * scaleY - tickLength);
      } else {
        ctx.moveTo(minX * scaleX, tickValue * scaleY);
        ctx.lineTo(minX * scaleX + tickLength, tickValue * scaleY);
      }
      ctx.stroke();
      sn = unwrapSN(tickValue);
      label = (expOn ? sn.s * Math.pow(10, sn.e - m) : tickValue).toFixed(fix);
      if (axis === "x") {
        ctx.fillText(label, tickValue * scaleX, minY * scaleY + lineHeight);
      } else {
        ctx.fillText(label, minX * scaleX - lineSpacing, tickValue * scaleY);
      }
    }
    ctx.restore();
  }
}

var plot = function(handle, xData, yData, type, color, dash, lineWidth, dotWidth) {
  var ctx = handle.ctx;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // plot origin in the bottom left corner
  ctx.translate(handle.plotOriginColumn, handle.canvasHeight - handle.plotOriginRow);
  // set plotting to data values
  ctx.translate(-handle.minX * handle.scaleX, -handle.minY * handle.scaleY);

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.setLineDash(dash);

  if (type === 'bar' || type === 'stick') {
    ctx.fillStyle = color;
  }

  if (type === 'bar') {
    var minXData, maxXData;
    [minXData, maxXData] = getMinMax(xData);
    var range = maxXData - minXData;
    var barSize = range / xData.length;
    var transparent = true;
  }

  ctx.beginPath();
  var xDataLength = xData.length;
  for (var i = 0; i < xDataLength; i++) {
    if (xData[i] >= handle.minX && xData[i] <= handle.maxX) {
      if (yData[i] >= handle.minY && yData[i] <= handle.maxY) {
        if (type === 'line') {
          ctx.lineTo(xData[i] * handle.scaleX, yData[i] * handle.scaleY);
        } else if (type === 'dot') {
          ctx.beginPath();
          ctx.arc(xData[i] * handle.scaleX, yData[i] * handle.scaleY, 4, 0, 2 * Math.PI);
          ctx.stroke();
        }
        if (type === 'bar') {
          ctx.beginPath();
          ctx.rect((xData[i] - barSize) * handle.scaleX, handle.minY * handle.scaleY,
          barSize * 1.125 * handle.scaleX, (yData[i] - handle.minY) * handle.scaleY);
          if (transparent) {
            ctx.globalAlpha = 1;
            transparent = false;
          } else {
            ctx.globalAlpha = 0.7;
            transparent = true;
          }
          ctx.fill();
        }
        if (type === 'stick') {
          ctx.beginPath();
          if (dotWidth > 0) {
            ctx.globalAlpha = 0.2;
          }
          ctx.moveTo(xData[i] * handle.scaleX, handle.minY * handle.scaleY);
          ctx.lineTo(xData[i] * handle.scaleX, yData[i] * handle.scaleY);
          ctx.stroke();
          if (dotWidth > 0) {
            ctx.beginPath();
            ctx.globalAlpha = 1;
            ctx.arc(xData[i] * handle.scaleX, yData[i] * handle.scaleY, dotWidth, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }
  }
  if (type === 'line') {
    ctx.stroke();
  }

  ctx.restore();
}

var hist = function(canvas, data, amount) {

  var bins = binning(data, amount);

  var minX, maxX, minY, maxY;
  [minX, maxX] = getMinMax(bins.value); // - 1.5 * barSize; + 0.5 * barSize
  [minY, maxY] = getMinMax(bins.frequency);

  var handle = figure(canvas, "Value", "Frequency", minX, maxX, minY, maxY);
  plot(handle, bins.value, bins.frequency, 'stick', 'blue', [], 1, 1);

  plot(handle, [bins.meanArithmetic], [handle.maxY], 'stick', 'purple', [], 1, 0);
  plot(handle, [bins.meanGeometric], [handle.maxY], 'stick', 'green', [], 1, 0);
  plot(handle, [bins.meanHarmonic], [handle.maxY], 'stick', 'red', [], 1, 0);

  function binning(data, amount) {
    // TODO: check data is one dimensional array
    // TODO: check amount is integer
    var offset, range, meanArithmetic;
    [offset, range, meanArithmetic] = getMinMaxMean(data);
    var meanGeometric = 0; // init
    var meanHarmonic = 0; // init
    var value = [];
    var frequency = [];

    if (amount < 1) {
      throw "binning: number of bins cannot be less than 1";
    } else if (amount === 1) {
      value[0] = meanArithmetic;
      frequency[0] = data.length;
    } else {
      var binSize = range / amount;
      var binMean = binSize / 2;
      for (var i = 0; i < amount; i++) { // fill the x values with the mean of each bin
        value[i] = offset + binMean + binSize * i;
        frequency[i] = 0; // initialise the counter
      }
      var binSizeUp = range / (amount - 1); // we determine the bin with round
      var binIndex;
      var dataSize = data.length;
      for (var i = 0; i < dataSize; i++) {
        meanGeometric += Math.log(data[i]);
        meanHarmonic += 1 / data[i];
        binIndex = Math.round((data[i] - offset) / binSizeUp);
        frequency[binIndex]++;
      }
    }
    return {
      value: value,
      frequency: frequency,
      meanArithmetic: meanArithmetic,
      meanGeometric: Math.exp(meanGeometric / dataSize),
      meanHarmonic: dataSize / meanHarmonic
    };
  }
}

module.exports = {
  display: display,
  figure: figure,
  plot: plot,
  hist: hist
}
