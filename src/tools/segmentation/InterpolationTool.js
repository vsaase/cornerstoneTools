import external from './../../externalModules.js';
import BaseTool from './../base/BaseTool.js';
import { getModule } from './../../store/index.js';
import { triggerLabelmapModifiedEvent } from './../../util/segmentation';
import { getToolState } from '../../stateManagement/toolState.js';
import { getLogger } from '../../util/logger.js';
import { getDiffBetweenPixelData } from '../../util/segmentation';

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
      configuration: {},
      mixins: [],
    };

    super(props, defaultProps);
  }

  preMouseDownCallback(evt) {
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
  _startPainting(evt) {
    const { configuration, getters } = segmentationModule;
    const eventData = evt.detail;
    const { element, image } = eventData;
    const { cornerstone } = external;
    const radius = configuration.radius;
    const { rows, columns } = image;
    const pixelSpacing = Math.max(
      image.rowPixelSpacing,
      image.columnPixelSpacing
    );

    const stackState = getToolState(element, 'stack');
    const stackData = stackState.data[0];
    const { imageIds } = stackData;

    const {
      labelmap2D,
      labelmap3D,
      currentImageIdIndex,
      activeLabelmapIndex,
    } = getters.labelmap2D(element);

    let imagesInRange = Array.from(
      { length: imageIds.length },
      (v, k) => k + 1
    );

    this.paintEventData = {
      labelmap2D,
      labelmap3D,
      currentImageIdIndex,
      activeLabelmapIndex,
      imagesInRange,
    };

    if (configuration.storeHistory) {
      const previousPixeldataForImagesInRange = [];

      for (let i = 0; i < imagesInRange.length; i++) {
        const { imageIdIndex } = imagesInRange[i];
        const labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(
          labelmap3D,
          imageIdIndex,
          rows,
          columns
        );

        const previousPixeldata = labelmap2DForImageIdIndex.pixelData.slice();

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
  _paint(evt) {
    const { getters } = segmentationModule;
    const eventData = evt.detail;
    const image = eventData.image;
    const { rows, columns } = image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const { labelmap3D, imagesInRange } = this.paintEventData;

    function getPixelData(i) {
      const labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(
        labelmap3D,
        i,
        rows,
        columns
      );
      return labelmap2DForImageIdIndex.pixelData;
    }

    function getSegmentArray(i) {
      const p1 = getPixelData(i);
      return p1.map(x => 1.0 * (x == labelmap3D.activeSegmentIndex));
    }

    function setSegmentArray(i, v) {
      var p1 = getPixelData(i);
      for (let j = 0; j < p1.length; j++) {
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
      const d = i2 - i1;
      var out = v1.slice();
      for (let j = 0; j < out.length; j++) {
        out[j] = (v1[j] * (i2 - i)) / d + (v2[j] * (i - i1)) / d;
      }
      return out.map(Math.round);
    }

    let i1 = 0;
    while (i1 < imagesInRange.length - 2) {
      console.log('i1', i1);
      //find first image i1 with active segment
      const v1 = getSegmentArray(i1); // get segment as binary vector v1
      if (v1.reduce((a, b) => a + b, 0) == 0) {
        //empty, try next
        console.log('empty');
        i1++;
        continue;
      }
      const vnext = getSegmentArray(i1 + 1);
      if (vnext.reduce((a, b) => a + b, 0) > 0) {
        //next is not empty, no need to interpolate
        console.log('next not empty');
        i1++;
        continue;
      }
      let i2 = i1 + 2;
      while (i2 < imagesInRange.length) {
        console.log('i2', i2);
        // find next image i2 with active segment
        const v2 = getSegmentArray(i2);
        if (v2.reduce((a, b) => a + b, 0) == 0) {
          //empty, try next
          console.log('i2 empty');
          i2++;
          continue;
        }
        console.log('interpolating from ' + i1 + ' to ' + i2);
        for (let i = i1 + 1; i < i2; i++) {
          const vi = interpolate(i, i1, i2, v1, v2);
          setSegmentArray(i, vi);
        }
        break;
      }
      i1 = i2;
    }

    external.cornerstone.updateImage(evt.detail.element);
  }

  _endPainting(evt) {
    const { labelmap3D, imagesInRange } = this.paintEventData;
    const operations = [];
    const { configuration, setters } = segmentationModule;

    for (let i = 0; i < imagesInRange.length; i++) {
      const { imageIdIndex } = imagesInRange[i];
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

      if (configuration.storeHistory) {
        const { previousPixeldataForImagesInRange } = this.paintEventData;

        const previousPixeldata = previousPixeldataForImagesInRange[i];
        const labelmap2D = labelmap3D.labelmaps2D[imageIdIndex];
        const newPixelData = labelmap2D.pixelData;

        operations.push({
          imageIdIndex,
          diff: getDiffBetweenPixelData(previousPixeldata, newPixelData),
        });
      }
    }

    if (configuration.storeHistory) {
      setters.pushState(this.element, operations);
    }

    triggerLabelmapModifiedEvent(this.element);
  }
}
