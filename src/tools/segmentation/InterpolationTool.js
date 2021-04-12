import external from './../../externalModules.js';
import BaseTool from './../base/BaseTool.js';
import { getModule } from './../../store/index.js';
import { triggerLabelmapModifiedEvent } from './../../util/segmentation';
import { getToolState } from '../../stateManagement/toolState.js';
import { getLogger } from '../../util/logger.js';
import { getDiffBetweenPixelData } from '../../util/segmentation';

import 'itk';
import IntTypes from 'itk/IntTypes';
import PixelTypes from 'itk/PixelTypes';
const itk = window.itk;

const logger = getLogger('tools:InterpolationTool');

const segmentationModule = getModule('segmentation');

/**
 * @public
 * @class InterpolationTool
 * @memberof Tools
 * @classdesc Tool for interpolating between segments across images.
 * @extends Tools.Base.BaseTool
 */
export default class InterpolationTool extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'Interpolation',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: { storeHistory: false },
      mixins: [],
    };

    super(props, defaultProps);
  }

  preMouseDownCallback(evt) {
    this._startPainting(evt);

    return true;
  }

  /**
   *
   * @abstract
   * @event
   * @param {Object} evt - The event.
   * @returns {void}
   */
  _startPainting(evt) {
    const { configuration, getters, setters } = segmentationModule;
    const eventData = evt.detail;
    const { element, image } = eventData;
    const { rows, columns } = image;

    const stackState = getToolState(element, 'stack');
    const stackData = stackState.data[0];
    const { imageIds } = stackData;

    const {
      labelmap2D,
      labelmap3D,
      currentImageIdIndex,
      activeLabelmapIndex,
    } = getters.labelmap2D(element);

    let imagesInRange = Array.from({ length: imageIds.length }, (v, k) => k);

    this.paintEventData = {
      labelmap2D,
      labelmap3D,
      currentImageIdIndex,
      activeLabelmapIndex,
      imagesInRange,
    };

    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    function getPixelData(i) {
      const labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(
        labelmap3D,
        i,
        rows,
        columns
      );
      return labelmap2DForImageIdIndex.pixelData;
    }

    const currentImagePixelbuffer = getPixelData(currentImageIdIndex);
    const nimageBytes = currentImagePixelbuffer.length;
    var currentVolumePixelbuffer = new Uint16Array(
      imagesInRange.length * nimageBytes
    );
    var offset = 0;
    for (let i = 0; i < imagesInRange.length; i++) {
      currentVolumePixelbuffer.set(getPixelData(i), offset);
      offset += nimageBytes;
    }

    const imageType = new itk.ImageType(
      3,
      IntTypes.UInt16,
      PixelTypes.Scalar,
      1
    );
    const itkImage = new itk.Image(imageType);
    itkImage.data = currentVolumePixelbuffer;
    itkImage.size = [columns, rows, imagesInRange.length];

    itk
      .runPipelineBrowser(
        null,
        'interpolation',
        [],
        [
          {
            path: 'output.json',
            type: itk.IOTypes.Image,
          },
        ],
        [
          {
            path: 'input.json',
            type: itk.IOTypes.Image,
            data: itkImage,
          },
        ]
      )
      .then(function({ stdout, stderr, outputs, webWorker }) {
        console.log(outputs);
        for (let i = 0; i < imagesInRange.length; i++) {
          var currentVolumePixelbuffer = outputs[0].data.data;
          const labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(
            labelmap3D,
            imagesInRange[i],
            rows,
            columns
          );
          labelmap2DForImageIdIndex.pixelData = currentVolumePixelbuffer.slice(
            i * nimageBytes,
            (i + 1) * nimageBytes
          );
          const labelmap2D = labelmap2DForImageIdIndex;

          const segmentSet = new Set(labelmap2D.pixelData);
          const iterator = segmentSet.values();

          const segmentsOnLabelmap = [];
          let done = false;

          while (!done) {
            const next = iterator.next();

            done = next.done;

            if (!done) {
              segmentsOnLabelmap.push(next.value);
            }
          }

          labelmap2D.segmentsOnLabelmap = segmentsOnLabelmap;
          labelmap2D.canvasElementNeedsUpdate = true;
        }

        triggerLabelmapModifiedEvent(element);
        external.cornerstone.updateImage(evt.detail.element);
      });

    // function getSegmentArray(i) {
    //   const p1 = getPixelData(i);
    //   return p1.map(x => x == labelmap3D.activeSegmentIndex);
    // }

    // function setSegmentArray(i, v) {
    //   var p1 = getPixelData(i);
    //   var changecount = 0;
    //   var changecandidates = v.reduce((a, b) => a + b, 0);
    //   for (let j = 0; j < p1.length; j++) {
    //     if (v[j] && p1[j] != labelmap3D.activeSegmentIndex) {
    //       changecount++;
    //     }
    //     p1[j] = v[j] ? labelmap3D.activeSegmentIndex : p1[j];
    //   }
    // }

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

    // function interpolate(i, i1, i2, v1, v2) {
    //   const d = i2 - i1;
    //   return v1.map(
    //     (x, j) => (x * (i2 - i)) / d + (v2[j] * (i - i1)) / d >= 0.5
    //   );
    //   // var out = v1.slice();
    //   // for (let j = 0; j < out.length; j++) {
    //   //   out[j] = (v1[j] * (i2 - i)) / d + (v2[j] * (i - i1)) / d;
    //   // }
    //   // return out.map(Math.round);
    // }

    // let i1 = 0;
    // while (i1 < imagesInRange.length - 2) {
    //   //find first image i1 with active segment
    //   const v1 = getSegmentArray(i1); // get segment as binary vector v1
    //   if (v1.reduce((a, b) => a + b, 0) == 0) {
    //     //empty, try next
    //     i1++;
    //     continue;
    //   }
    //   const vnext = getSegmentArray(i1 + 1);
    //   if (vnext.reduce((a, b) => a + b, 0) > 0) {
    //     //next is not empty, no need to interpolate
    //     i1++;
    //     continue;
    //   }
    //   let i2 = i1 + 2;
    //   while (i2 < imagesInRange.length) {
    //     // find next image i2 with active segment
    //     const v2 = getSegmentArray(i2);
    //     if (v2.reduce((a, b) => a + b, 0) == 0) {
    //       //empty, try next
    //       i2++;
    //       continue;
    //     }
    //     for (let i = i1 + 1; i < i2; i++) {
    //       const vi = interpolate(i, i1, i2, v1, v2);
    //       setSegmentArray(i, vi);
    //     }
    //     break;
    //   }
    //   i1 = i2;
    // }

    function _finally() {
      const operations = [];

      for (let i = 0; i < imagesInRange.length; i++) {
        const imageIdIndex = imagesInRange[i];
        const labelmap2D = labelmap3D.labelmaps2D[imageIdIndex];

        // Grab the labels on the slice.
        const segmentSet = new Set(labelmap2D.pixelData);
        const iterator = segmentSet.values();

        const segmentsOnLabelmap = [];
        let done = false;

        while (!done) {
          const next = iterator.next();

          done = next.done;

          if (!done) {
            segmentsOnLabelmap.push(next.value);
          }
        }

        labelmap2D.segmentsOnLabelmap = segmentsOnLabelmap;
        labelmap2D.canvasElementNeedsUpdate = true;

        // if (configuration.storeHistory) {
        //   const { previousPixeldataForImagesInRange } = this.paintEventData;

        //   const previousPixeldata = previousPixeldataForImagesInRange[i];
        //   const labelmap2D = labelmap3D.labelmaps2D[imageIdIndex];
        //   const newPixelData = labelmap2D.pixelData;

        //   operations.push({
        //     imageIdIndex,
        //     diff: getDiffBetweenPixelData(previousPixeldata, newPixelData),
        //   });
        // }
      }

      // if (configuration.storeHistory) {
      //   setters.pushState(this.element, operations);
      // }

      triggerLabelmapModifiedEvent(this.element);
      external.cornerstone.updateImage(evt.detail.element);
    }
  }
}
