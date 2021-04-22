#include <iostream>
#include "itkImageFileReader.h"
#include "itkImageFileWriter.h"
#include "itkConfidenceConnectedImageFilter.h"
#include "itkBinaryMorphologicalClosingImageFilter.h"
#include "itkBinaryBallStructuringElement.h"
#include <cstdlib>
#include "itkJSONImageIO.h"
#include <string>
#include <fstream>

// from https://github.com/KitwareMedical/ITKMorphologicalContourInterpolation/blob/master/test/itkMorphologicalContourInterpolationTest.cxx
template <typename ImageType>
void doSegmentation(std::string inFilename, std::string outFilename, unsigned int xpos, unsigned int ypos, unsigned int zpos)
{
  std::cout << "Creating Reader" << std::endl;
  using ReaderType = itk::ImageFileReader<ImageType>;
  typename ReaderType::Pointer reader = ReaderType::New();
  reader->SetFileName(inFilename);
  reader->Update();

  typename ImageType::Pointer image = reader->GetOutput();
  typename ImageType::IndexType pixelIndex;
  pixelIndex[0] = xpos; // x position of the pixel
  pixelIndex[1] = ypos; // y position of the pixel
  pixelIndex[2] = zpos; // z position of the pixel

  typename ImageType::PixelType pixelValue = image->GetPixel(pixelIndex);
  std::cout << "pixelValue at click " << pixelValue << std::endl;

  std::cout << "Creating Confidence Connected filter" << std::endl;
  using ConfidenceConnectedFilterType = itk::ConfidenceConnectedImageFilter<ImageType, ImageType>;
  typename ConfidenceConnectedFilterType::Pointer confidenceConnectedFilter = ConfidenceConnectedFilterType::New();
  confidenceConnectedFilter->SetInitialNeighborhoodRadius(1);
  confidenceConnectedFilter->SetMultiplier(1);
  confidenceConnectedFilter->SetNumberOfIterations(0);
  confidenceConnectedFilter->SetReplaceValue(1);

  // Set seed
  confidenceConnectedFilter->SetSeed(pixelIndex);
  confidenceConnectedFilter->SetInput(reader->GetOutput());

  using StructuringElementType = itk::FlatStructuringElement<ImageType::ImageDimension>;
  typename StructuringElementType::RadiusType elementRadius;
  elementRadius.Fill(3);
  StructuringElementType structuringElement = StructuringElementType::Box(elementRadius);

  using BinaryMorphologicalClosingImageFilterType =
      itk::BinaryMorphologicalClosingImageFilter<ImageType, ImageType, StructuringElementType>;
  typename BinaryMorphologicalClosingImageFilterType::Pointer closingFilter = BinaryMorphologicalClosingImageFilterType::New();
  closingFilter->SetInput(confidenceConnectedFilter->GetOutput());
  closingFilter->SetKernel(structuringElement);
  closingFilter->SetForegroundValue(1);

  std::cout << "Creating Output" << std::endl;
  using WriterType = itk::ImageFileWriter<ImageType>;
  typename WriterType::Pointer writer = WriterType::New();
  writer->SetFileName(outFilename);
  writer->SetInput(closingFilter->GetOutput());
  writer->SetUseCompression(true);

  std::cout << "Running Pipeline" << std::endl;
  writer->Update();
  std::cout << "Finished" << std::endl;
}

int main(int argc, char *argv[])
{
  std::cout << "Starting Segmentation with ITK.JS!" << std::endl;
  unsigned int xpos = atoi(argv[1]);
  unsigned int ypos = atoi(argv[2]);
  unsigned int zpos = atoi(argv[3]);

  itk::JSONImageIO::Pointer imageIO = itk::JSONImageIO::New();
  imageIO->SetFileName("input.json");
  imageIO->ReadImageInformation();

  using IOComponentType = itk::IOComponentEnum;
  const IOComponentType componentType = imageIO->GetComponentType();

  using IOPixelType = itk::IOPixelEnum;
  const IOPixelType pixelType = imageIO->GetPixelType();

  const unsigned int imageDimension = imageIO->GetNumberOfDimensions();

  std::cout << componentType << std::endl;
  std::cout << pixelType << std::endl;
  std::cout << imageDimension << std::endl;
  std::cout << argv[1] << " " << argv[2] << " " << argv[3] << std::endl;

  // using PixelType = itk::Vector<unsigned short, 1>;
  using PixelType = unsigned short;
  using ImageType = itk::Image<PixelType, 3>;

  doSegmentation<ImageType>("input.json", "output.json", xpos, ypos, zpos);
  return 0;
}
