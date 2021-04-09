/*! cornerstone-tools - 4.0.1 - 2021-04-09 | (c) 2017 Chris Hafey | https://github.com/cornerstonejs/cornerstoneTools */
webpackHotUpdate("cornerstoneTools",{

/***/ "./tools/segmentation/InterpolationTool.js":
/*!*************************************************!*\
  !*** ./tools/segmentation/InterpolationTool.js ***!
  \*************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return InterpolationTool; });
/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "../node_modules/@babel/runtime/helpers/classCallCheck.js");
/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/createClass */ "../node_modules/@babel/runtime/helpers/createClass.js");
/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _babel_runtime_helpers_possibleConstructorReturn__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/possibleConstructorReturn */ "../node_modules/@babel/runtime/helpers/possibleConstructorReturn.js");
/* harmony import */ var _babel_runtime_helpers_possibleConstructorReturn__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_possibleConstructorReturn__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _babel_runtime_helpers_getPrototypeOf__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/helpers/getPrototypeOf */ "../node_modules/@babel/runtime/helpers/getPrototypeOf.js");
/* harmony import */ var _babel_runtime_helpers_getPrototypeOf__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_getPrototypeOf__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _babel_runtime_helpers_inherits__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @babel/runtime/helpers/inherits */ "../node_modules/@babel/runtime/helpers/inherits.js");
/* harmony import */ var _babel_runtime_helpers_inherits__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_inherits__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _externalModules_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./../../externalModules.js */ "./externalModules.js");
/* harmony import */ var _base_BaseTool_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./../base/BaseTool.js */ "./tools/base/BaseTool.js");
/* harmony import */ var _store_index_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./../../store/index.js */ "./store/index.js");
/* harmony import */ var _util_segmentation__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./../../util/segmentation */ "./util/segmentation/index.js");
/* harmony import */ var _stateManagement_toolState_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../stateManagement/toolState.js */ "./stateManagement/toolState.js");
/* harmony import */ var _util_logger_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../util/logger.js */ "./util/logger.js");












var logger = Object(_util_logger_js__WEBPACK_IMPORTED_MODULE_10__["getLogger"])('tools:InterpolationTool');
var segmentationModule = Object(_store_index_js__WEBPACK_IMPORTED_MODULE_7__["getModule"])('segmentation');
/**
 * @public
 * @class InterpolationTool
 * @memberof Tools
 * @classdesc Tool for interpolating between segments across images.
 * @extends Tools.Base.BaseTool
 */

var InterpolationTool =
/*#__PURE__*/
function (_BaseTool) {
  _babel_runtime_helpers_inherits__WEBPACK_IMPORTED_MODULE_4___default()(InterpolationTool, _BaseTool);

  function InterpolationTool() {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_0___default()(this, InterpolationTool);

    var defaultProps = {
      name: 'Interpolation',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
      mixins: []
    };
    return _babel_runtime_helpers_possibleConstructorReturn__WEBPACK_IMPORTED_MODULE_2___default()(this, _babel_runtime_helpers_getPrototypeOf__WEBPACK_IMPORTED_MODULE_3___default()(InterpolationTool).call(this, props, defaultProps));
  }

  _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_1___default()(InterpolationTool, [{
    key: "preMouseDownCallback",
    value: function preMouseDownCallback(evt) {
      this._startPainting(evt);

      this._paint(evt);

      this._endPainting(evt);

      return true;
    }
    /**
     *
     * @abstract
     * @event
     * @param {Object} evt - The event.
     * @returns {void}
     */

  }, {
    key: "_startPainting",
    value: function _startPainting(evt) {
      var configuration = segmentationModule.configuration,
          getters = segmentationModule.getters;
      var eventData = evt.detail;
      var element = eventData.element,
          image = eventData.image;
      var rows = image.rows,
          columns = image.columns;
      var stackState = Object(_stateManagement_toolState_js__WEBPACK_IMPORTED_MODULE_9__["getToolState"])(element, 'stack');
      var stackData = stackState.data[0];
      var imageIds = stackData.imageIds;

      var _getters$labelmap2D = getters.labelmap2D(element),
          labelmap2D = _getters$labelmap2D.labelmap2D,
          labelmap3D = _getters$labelmap2D.labelmap3D,
          currentImageIdIndex = _getters$labelmap2D.currentImageIdIndex,
          activeLabelmapIndex = _getters$labelmap2D.activeLabelmapIndex;

      var imagesInRange = Array.from({
        length: imageIds.length
      }, function (v, k) {
        return k + 1;
      });
      this.paintEventData = {
        labelmap2D: labelmap2D,
        labelmap3D: labelmap3D,
        currentImageIdIndex: currentImageIdIndex,
        activeLabelmapIndex: activeLabelmapIndex,
        imagesInRange: imagesInRange
      };

      if (configuration.storeHistory) {
        var previousPixeldataForImagesInRange = [];

        for (var i = 0; i < imagesInRange.length; i++) {
          var imageIdIndex = imagesInRange[i].imageIdIndex;
          var labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(labelmap3D, imageIdIndex, rows, columns);
          var previousPixeldata = labelmap2DForImageIdIndex.pixelData.slice();
          previousPixeldataForImagesInRange.push(previousPixeldata);
        }

        this.paintEventData.previousPixeldataForImagesInRange = previousPixeldataForImagesInRange;
      }
    }
    /**
     * Paints the data to the labelmap.
     *
     * @private
     * @param  {Object} evt The data object associated with the event.
     * @returns {void}
     */

  }, {
    key: "_paint",
    value: function _paint(evt) {
      var getters = segmentationModule.getters;
      var eventData = evt.detail;
      var image = eventData.image;
      var rows = image.rows,
          columns = image.columns;
      var _eventData$currentPoi = eventData.currentPoints.image,
          x = _eventData$currentPoi.x,
          y = _eventData$currentPoi.y;

      if (x < 0 || x > columns || y < 0 || y > rows) {
        return;
      }

      var _this$paintEventData = this.paintEventData,
          labelmap3D = _this$paintEventData.labelmap3D,
          imagesInRange = _this$paintEventData.imagesInRange;

      function getPixelData(i) {
        var labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(labelmap3D, i, rows, columns);
        return labelmap2DForImageIdIndex.pixelData;
      }

      function getSegmentArray(i) {
        var p1 = getPixelData(i);
        return p1.map(function (x) {
          return x == labelmap3D.activeSegmentIndex;
        });
      }

      function setSegmentArray(i, v) {
        console.log('setting image ' + i);
        var p1 = getPixelData(i);

        for (var j = 0; j < p1.length; j++) {
          p1[j] = v[j] ? labelmap3D.activeSegmentIndex : p1[j];
        }
      }
      /* Algorithm for interpolation
        find first image i1 with active segment
        save segment as binary vector v1
         until i2 > imagesInRange
          find next image i2 with active segment
          save segment as binary vector v2
          d = i2 - i1
          if d > 1
            for i in i1+1 to i2-1
              for j in 1:length(v1)
                if v1[j] * (i2 - i)/d + v2[j] * (i - i1)/d > 0.5
                  v[j] = activesegment
          v1 = v2
          i1 = i2
      */


      function interpolate(i, i1, i2, v1, v2) {
        var d = i2 - i1;
        return v1.map(function (x, j) {
          return x * (i2 - i) / d + v2[j] * (i - i1) / d > 0.5;
        }); // var out = v1.slice();
        // for (let j = 0; j < out.length; j++) {
        //   out[j] = (v1[j] * (i2 - i)) / d + (v2[j] * (i - i1)) / d;
        // }
        // return out.map(Math.round);
      }

      var i1 = 0;

      while (i1 < imagesInRange.length - 2) {
        //find first image i1 with active segment
        var v1 = getSegmentArray(i1); // get segment as binary vector v1

        if (v1.reduce(function (a, b) {
          return a + b;
        }, 0) == 0) {
          //empty, try next
          i1++;
          continue;
        }

        var vnext = getSegmentArray(i1 + 1);

        if (vnext.reduce(function (a, b) {
          return a + b;
        }, 0) > 0) {
          //next is not empty, no need to interpolate
          i1++;
          continue;
        }

        var i2 = i1 + 2;

        while (i2 < imagesInRange.length) {
          // find next image i2 with active segment
          var v2 = getSegmentArray(i2);

          if (v2.reduce(function (a, b) {
            return a + b;
          }, 0) == 0) {
            //empty, try next
            i2++;
            continue;
          }

          for (var i = i1 + 1; i < i2; i++) {
            var vi = interpolate(i, i1, i2, v1, v2);
            setSegmentArray(i, vi);
          }

          break;
        }

        i1 = i2;
      }

      _externalModules_js__WEBPACK_IMPORTED_MODULE_5__["default"].cornerstone.updateImage(evt.detail.element);
    }
  }, {
    key: "_endPainting",
    value: function _endPainting(evt) {
      var _this$paintEventData2 = this.paintEventData,
          labelmap3D = _this$paintEventData2.labelmap3D,
          imagesInRange = _this$paintEventData2.imagesInRange;
      var operations = [];
      var configuration = segmentationModule.configuration,
          setters = segmentationModule.setters;

      for (var i = 0; i < imagesInRange.length; i++) {
        var imageIdIndex = imagesInRange[i].imageIdIndex;
        var labelmap2D = labelmap3D.labelmaps2D[imageIdIndex]; // Grab the labels on the slice.

        var segmentSet = new Set(labelmap2D.pixelData);
        var iterator = segmentSet.values();
        var segmentsOnLabelmap = [];
        var done = false;

        while (!done) {
          var next = iterator.next();
          done = next.done;

          if (!done) {
            segmentsOnLabelmap.push(next.value);
          }
        }

        labelmap2D.segmentsOnLabelmap = segmentsOnLabelmap;

        if (configuration.storeHistory) {
          var previousPixeldataForImagesInRange = this.paintEventData.previousPixeldataForImagesInRange;
          var previousPixeldata = previousPixeldataForImagesInRange[i];
          var _labelmap2D = labelmap3D.labelmaps2D[imageIdIndex];
          var newPixelData = _labelmap2D.pixelData;
          operations.push({
            imageIdIndex: imageIdIndex,
            diff: Object(_util_segmentation__WEBPACK_IMPORTED_MODULE_8__["getDiffBetweenPixelData"])(previousPixeldata, newPixelData)
          });
        }
      }

      if (configuration.storeHistory) {
        setters.pushState(this.element, operations);
      }

      Object(_util_segmentation__WEBPACK_IMPORTED_MODULE_8__["triggerLabelmapModifiedEvent"])(this.element);
    }
  }]);

  return InterpolationTool;
}(_base_BaseTool_js__WEBPACK_IMPORTED_MODULE_6__["default"]);



/***/ })

})
//# sourceMappingURL=cornerstoneTools.e85f52d77fa75f04b214.hot-update.js.map