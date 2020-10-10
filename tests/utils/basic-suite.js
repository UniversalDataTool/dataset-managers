export default async (dm, t) => {
  const datasetReloadPromise = new Promise((resolve) =>
    dm.once("dataset-reloaded", resolve)
  )

  dm.setDataset({
    interface: {
      type: "image_classification",
    },
    samples: [],
  })

  await datasetReloadPromise

  const iface = await dm.getDatasetProperty("interface")

  t.deepEqual(iface.type, "image_classification")

  let summaryUpdatePromise = new Promise((resolve) =>
    dm.once("summary-changed", resolve)
  )

  dm.addSamples([
    {
      imageUrl: "https://example.com/image1.png",
    },
    {
      imageUrl: "https://example.com/image2.png",
    },
  ])

  await summaryUpdatePromise

  let summary = await dm.getSummary()

  t.like(summary.samples[0], {
    hasAnnotation: false,
  })
  t.like(summary.samples[1], {
    hasAnnotation: false,
  })
  t.truthy(summary.samples[0]._id)

  const sampleRef = summary.samples[0]._id
  const s = await dm.getSample(sampleRef)

  summaryUpdatePromise = new Promise((resolve) =>
    dm.once("summary-changed", resolve)
  )
  await dm.setSample(sampleRef, {
    ...s,
    annotation: "bat",
  })

  await summaryUpdatePromise

  summary = await dm.getSummary()
  t.like(summary.samples[0], {
    hasAnnotation: true,
  })

  const updatedSample = await dm.getSample(sampleRef)
  t.truthy(updatedSample.annotation)

  summaryUpdatePromise = new Promise((resolve) =>
    dm.once("summary-changed", resolve)
  )
  await dm.removeSamples([sampleRef])

  await summaryUpdatePromise

  t.is((await dm.getSummary()).samples.length, 1)

  let ds = await dm.getDataset()

  t.like(ds, {
    interface: { type: "image_classification" },
  })
  t.like(ds.samples[0], {
    imageUrl: "https://example.com/image2.png",
  })

  summaryUpdatePromise = new Promise((resolve) =>
    dm.once("summary-changed", resolve)
  )
  await dm.setDataset({
    ...ds,
    samples: ds.samples.concat([
      {
        imageUrl: "https://example.com/image3.png",
      },
    ]),
  })

  await summaryUpdatePromise

  summary = await dm.getSummary()
  t.is(summary.samples.length, 2)
}
