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

  activeCallback(element) {
    this._startPainting(element);
    return true;
  }

  /**
   *
   * @abstract
   * @event
   * @param {Object} evt - The event.
   * @returns {void}
   */
  _startPainting(element) {
    const { configuration, getters, setters } = segmentationModule;
    const enabledElement = external.cornerstone.getEnabledElement(element);
    if (enabledElement.image === undefined) {
      return;
    }
    const { rows, columns } = enabledElement.image;

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
        [labelmap3D.activeSegmentIndex.toString()],
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
        external.cornerstone.updateImage(element);
      });
  }
}
