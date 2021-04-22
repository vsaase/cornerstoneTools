import external from './../../externalModules.js';
import BaseTool from './../base/BaseTool.js';
import { getModule } from './../../store/index.js';
import { triggerLabelmapModifiedEvent } from './../../util/segmentation';
import { getToolState } from '../../stateManagement/toolState.js';
import getPixelSpacing from '../../util/getPixelSpacing';
import { getLogger } from '../../util/logger.js';

import 'itk';
import IntTypes from 'itk/IntTypes';
import PixelTypes from 'itk/PixelTypes';

const itk = window.itk;
const logger = getLogger('tools:ITKSegmentationTool');
const segmentationModule = getModule('segmentation');

/**
 * @public
 * @class ITKSegmentationTool
 * @memberof Tools
 * @classdesc Tool for interpolating between segments across images.
 * @extends Tools.Base.BaseTool
 */
export default class ITKSegmentationTool extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'ITKSegmentation',
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
    console.log(evt);
    const eventData = evt.detail;
    const element = eventData.element;
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

    const imagesInRange = Array.from({ length: imageIds.length }, (v, k) => k);

    this.paintEventData = {
      labelmap2D,
      labelmap3D,
      currentImageIdIndex,
      activeLabelmapIndex,
      imagesInRange,
    };

    const sourceImagePoint = [
      eventData.currentPoints.image.x,
      eventData.currentPoints.image.y,
      currentImageIdIndex,
    ];

    function getSegmentationPixelData(i) {
      const labelmap2DForImageIdIndex = getters.labelmap2DByImageIdIndex(
        labelmap3D,
        i,
        rows,
        columns
      );

      return labelmap2DForImageIdIndex.pixelData;
    }

    async function getITKVolume() {
      const cornerstone = external.cornerstone;
      const imageloaders = imageIds.map(cornerstone.loadAndCacheImage);

      const images = await Promise.all(imageloaders);
      const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(images[0]);

      const sliceThickness = 3.0; //HACK
      // try {
      //   parseFloat(images[0].data.string('x00180050'));
      // } finally {
      //   true;
      // }
      const imagesdata = images.map(x => x.getPixelData());

      const nimageBytes = imagesdata[0].length;
      const currentVolumePixelbuffer = new Uint16Array(
        imagesdata.length * nimageBytes
      );
      let offset = 0;

      for (let i = 0; i < imagesInRange.length; i++) {
        currentVolumePixelbuffer.set(imagesdata[i], offset);
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
      itkImage.spacing = [rowPixelSpacing, colPixelSpacing, sliceThickness];
      itkImage.size = [columns, rows, imagesInRange.length];

      return itkImage;
    }

    getITKVolume().then(itkImage => {
      console.log(itkImage);
      console.log(sourceImagePoint);
      itk
        .runPipelineBrowser(
          null,
          'segmentation',
          [...sourceImagePoint.map(Math.round).map(x => x.toString())],
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
          console.log(stderr);
          const currentVolumePixelbuffer = outputs[0].data.data;

          const nimageBytes =
            currentVolumePixelbuffer.length / imagesInRange.length;

          for (let i = 0; i < imagesInRange.length; i++) {
            const labelmap2D = getters.labelmap2DByImageIdIndex(
              labelmap3D,
              imagesInRange[i],
              rows,
              columns
            );

            currentVolumePixelbuffer
              .slice(i * nimageBytes, (i + 1) * nimageBytes)
              .forEach((val, idx) => {
                if (val === 1) {
                  if (eventData.buttons === 1) {
                    labelmap2D.pixelData[idx] = labelmap3D.activeSegmentIndex;
                  } else if (eventData.buttons === 2) {
                    labelmap2D.pixelData[idx] = 0;
                  }
                }
              });
            setters.updateSegmentsOnLabelmap2D(labelmap2D);
          }

          triggerLabelmapModifiedEvent(element);
          external.cornerstone.updateImage(element);
        });
    });
  }
}
