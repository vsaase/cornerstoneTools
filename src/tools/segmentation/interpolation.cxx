#include <iostream>
#include "itkImageFileReader.h"
#include "itkImageFileWriter.h"
#include "itkMorphologicalContourInterpolator.h"
#include <cstdlib>
#include "itkJSONImageIO.h"
#include <string>
#include <fstream>

// from https://github.com/KitwareMedical/ITKMorphologicalContourInterpolation/blob/master/test/itkMorphologicalContourInterpolationTest.cxx
template <typename ImageType>
void doTest(std::string inFilename, std::string outFilename, bool UseDistanceTransform, bool ball, int axis, int label)
{
  using ReaderType = itk::ImageFileReader<ImageType>;
  typename ReaderType::Pointer reader = ReaderType::New();
  reader->SetFileName(inFilename);
  reader->Update();

  typename ImageType::Pointer test = reader->GetOutput();

  // region for partial coverage
  typename ImageType::RegionType reg = test->GetLargestPossibleRegion();
  // for (int i = 0; i < ImageType::ImageDimension; i++)
  //  {
  //  reg.GetModifiableIndex()[i] += (reg.GetSize(i) - 1) / 4;
  //  reg.SetSize(i, (reg.GetSize(i) + 1) / 2);
  //  }

  using mciType = itk::MorphologicalContourInterpolator<ImageType>;
  typename mciType::Pointer mci = mciType::New();
  mci->SetInput(test);
  mci->SetUseDistanceTransform(UseDistanceTransform);
  mci->SetUseBallStructuringElement(ball);
  mci->SetAxis(axis);
  mci->SetLabel(label);

  using WriterType = itk::ImageFileWriter<ImageType>;
  typename WriterType::Pointer writer = WriterType::New();
  writer->SetFileName(outFilename);
  writer->SetInput(mci->GetOutput());
  writer->SetUseCompression(true);
  writer->Update();
}

int main(int argc, char *argv[])
{
  std::cout << "Starting Interpolation with ITK.JS!" << std::endl;
  unsigned int label = atoi(argv[1]);

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
  std::cout << argv[1] << std::endl;

  doTest<itk::Image<unsigned short, 3>>("input.json", "output.json", false, true, 2, label);
  return 0;
}
