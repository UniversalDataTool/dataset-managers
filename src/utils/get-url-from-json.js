const getSampleUrl = (sample) => {
  return (
    sample.imageUrl ||
    sample.videoUrl ||
    sample.audioUrl ||
    sample.pdfUrl ||
    undefined
  )
}
export default getSampleUrl
