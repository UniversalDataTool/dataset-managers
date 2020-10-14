export default async (dm, t) => {
  let stepsCompleted = 0
  const stepLog = (...args) => console.log(`[${1 + stepsCompleted++}]`, ...args)

  const datasetReloadPromise = new Promise((resolve) =>
    dm.once("dataset-reloaded", resolve)
  )

  stepLog("setting dataset...")
  await dm.setDataset({
    interface: {
      type: "image_classification",
    },
    samples: [],
  })

  await datasetReloadPromise

  stepLog("getting interface...")
  const iface = await dm.getDatasetProperty("interface")

  t.deepEqual(iface.type, "image_classification")

  let summaryUpdatePromise = new Promise((resolve) =>
    dm.once("summary-changed", resolve)
  )

  stepLog("adding samples...")
  dm.addSamples([
    {
      imageUrl: "https://example.com/image1.png",
    },
    {
      imageUrl: "https://example.com/image2.png",
    },
  ])

  await summaryUpdatePromise

  stepLog("getting summary...")
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
  stepLog("setting sample...")
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
  stepLog("removing sample...")
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

  stepLog("setting dataset (2)...")
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
