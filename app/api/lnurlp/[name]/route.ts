export async function GET(
  request: Request,
  { params }: { params: { name: string } },
) {
  const name = params.name
  if (!name) {
    return Response.json({})
  }
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/mapboss/lightning-address/main/${name}.json`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_API_KEY}`,
          Host: 'raw.githubusercontent.com',
        },
        next: { revalidate: 300 },
      },
    )
    const result = await res.json()
    return Response.json(result)
  } catch (err) {
    return new Response(null, {
      status: 500,
    })
  }
}
