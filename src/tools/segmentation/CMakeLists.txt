cmake_minimum_required(VERSION 3.10)
project(Interpolation)

set(io_components BridgeJavaScript)
# Find ITK.
find_package(ITK REQUIRED
  COMPONENTS ${io_components}
  ITKImageGrid
  ITKImageFunction
  MorphologicalContourInterpolation
)
include(${ITK_USE_FILE})

add_executable(interpolation interpolation.cxx)


target_link_libraries(interpolation ${ITK_LIBRARIES})
