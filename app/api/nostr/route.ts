export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) {
    return Response.json({})
  }
  const res = await fetch(
    `https://raw.githubusercontent.com/mapboss/nostr-address/main/nostr.json`,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_API_KEY}`,
        Host: 'raw.githubusercontent.com',
      },
      next: { revalidate: 300 },
    },
  )
  const result = await res.json()
  const pubkey = result.names?.[name]
  if (!pubkey) {
    return Response.json({})
  }
  const relays = result.relays?.[pubkey]
  return Response.json({ names: { [name]: pubkey }, relays })
}
