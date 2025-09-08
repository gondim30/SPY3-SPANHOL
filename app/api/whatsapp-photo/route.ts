import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // JSON-default de retorno em caso de falha da API externa
  const fallbackPayload = {
    success: true,
    result:
      "https://i0.wp.com/digitalhealthskills.com/wp-content/uploads/2022/11/3da39-no-user-image-icon-27.png?fit=500%2C500&ssl=1",
    is_photo_private: true,
  }

  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/[^0-9]/g, "")

    // Validação básica - número deve ter pelo menos 10 dígitos
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    // Usa o número como está (deve incluir código do país)
    const fullNumber = cleanPhone
    const apiUrl = `https://us.api-wa.me/x2136xcbccd9f94561931/contacts/${fullNumber}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // timeout de 10 s (Edge Runtime aceita AbortController)
      signal: AbortSignal.timeout?.(10_000),
    })

    // Se a API externa falhar, devolvemos payload padrão 200
    if (!response.ok) {
      console.error("API externa retornou status:", response.status)
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    let data
    try {
      const responseText = await response.text()
      console.log("[v0] Resposta bruta da API:", responseText)

      // Verifica se a resposta é JSON válido
      if (responseText.trim().startsWith("{") || responseText.trim().startsWith("[")) {
        data = JSON.parse(responseText)
      } else {
        // Se não é JSON, trata como erro e usa fallback
        console.log("[v0] Resposta não é JSON válido, usando fallback")
        return NextResponse.json(fallbackPayload, {
          status: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
        })
      }
    } catch (parseError) {
      console.error("[v0] Erro ao fazer parse do JSON:", parseError)
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const profilePic = data?.profile?.image
    const isPhotoPrivate = !profilePic || profilePic.includes("no-user-image-icon")

    return NextResponse.json(
      {
        success: true,
        result: isPhotoPrivate ? fallbackPayload.result : profilePic,
        is_photo_private: isPhotoPrivate,
      },
      {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    )
  } catch (err) {
    console.error("Erro no webhook WhatsApp:", err)
    // Nunca deixamos propagar status 500; devolvemos fallback
    return NextResponse.json(fallbackPayload, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
