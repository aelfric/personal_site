class OptimizeImage < Nanoc::Filter
  identifier :optimize
  type       :binary

  def run(filename, params = {})
    system(
      'convert',
      '-resize',
      '2000x2000',
      '-strip',
      '-interlace',
      'Plane',
      '-quality',
      '85%',
      filename,
      output_filename
    )
  end
end
