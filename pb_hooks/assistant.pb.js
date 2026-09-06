function assistantTools() {
  return [
    {
      type: "function",
      function: {
        name: "list_contacts",
        description: "List the user's 20 newest CRM contacts",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    },
    {
      type: "function",
      function: {
        name: "create_contact",
        description: "Create a CRM contact only when the user explicitly asks",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_deals",
        description: "List the user's 20 newest CRM deals",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    },
    {
      type: "function",
      function: {
        name: "create_deal",
        description: "Create a CRM deal only when the user explicitly asks",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            amount: { type: "number", minimum: 0 },
            stage: { type: "string", enum: ["lead", "qualified", "proposal", "won", "lost"] },
          },
          required: ["title", "amount", "stage"],
          additionalProperties: false,
        },
      },
    },
  ]
}

function callOpenRouter(messages) {
  const apiKey = $os.getenv("OPENROUTER_API_KEY")
  if (!apiKey) {
    throw new InternalServerError("OPENROUTER_API_KEY is not configured")
  }
  const response = $http.send({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json",
      "HTTP-Referer": $os.getenv("PUBLIC_APP_URL") || "http://localhost:8090",
      "X-Title": "Taboon CRM",
    },
    body: JSON.stringify({
      model: $os.getenv("OPENROUTER_MODEL") || "openai/gpt-5-mini",
      messages: messages,
      tools: assistantTools(),
      tool_choice: "auto",
    }),
    timeout: 90,
  })
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new InternalServerError("OpenRouter request failed")
  }
  const choice = response.json && response.json.choices && response.json.choices[0]
  if (!choice || !choice.message) {
    throw new InternalServerError("OpenRouter returned no message")
  }
  return choice.message
}

function recordObject(record, fields) {
  const value = { id: record.id }
  for (const field of fields) {
    value[field] = record.get(field)
  }
  return value
}

function runTool(app, owner, name, rawArguments) {
  let args = {}
  try {
    args = JSON.parse(rawArguments || "{}")
  } catch (_) {
    throw new BadRequestError("Invalid assistant tool arguments")
  }

  if (name === "list_contacts") {
    return app.findRecordsByFilter("contacts", "owner = {:owner}", "-created", 20, 0, { owner: owner })
      .map((record) => recordObject(record, ["name", "email", "phone", "company"]))
  }
  if (name === "list_deals") {
    return app.findRecordsByFilter("deals", "owner = {:owner}", "-created", 20, 0, { owner: owner })
      .map((record) => recordObject(record, ["title", "amount", "stage", "company", "contact"]))
  }
  if (name === "create_contact") {
    if (typeof args.name !== "string" || !args.name.trim()) {
      throw new BadRequestError("Contact name is required")
    }
    const record = new Record(app.findCollectionByNameOrId("contacts"))
    record.set("owner", owner)
    record.set("name", args.name.trim())
    record.set("email", typeof args.email === "string" ? args.email.trim() : "")
    record.set("phone", typeof args.phone === "string" ? args.phone.trim() : "")
    app.save(record)
    return recordObject(record, ["name", "email", "phone"])
  }
  if (name === "create_deal") {
    if (typeof args.title !== "string" || !args.title.trim() || typeof args.amount !== "number") {
      throw new BadRequestError("Deal title and amount are required")
    }
    const allowedStages = ["lead", "qualified", "proposal", "won", "lost"]
    if (allowedStages.indexOf(args.stage) === -1) {
      throw new BadRequestError("Invalid deal stage")
    }
    const record = new Record(app.findCollectionByNameOrId("deals"))
    record.set("owner", owner)
    record.set("title", args.title.trim())
    record.set("amount", args.amount)
    record.set("stage", args.stage)
    app.save(record)
    return recordObject(record, ["title", "amount", "stage"])
  }
  throw new BadRequestError("Unknown assistant tool")
}

routerAdd("POST", "/api/taboon-crm/assistant", (e) => {
  const input = new DynamicModel({ message: "" })
  e.bindBody(input)
  if (!input.message || !input.message.trim()) {
    throw new BadRequestError("Message is required")
  }

  const messages = [
    { role: "system", content: "You are a concise CRM assistant. Read records when useful. Only create records when the user explicitly asks you to do so." },
    { role: "user", content: input.message.trim() },
  ]

  for (let turn = 0; turn < 3; turn++) {
    const message = callOpenRouter(messages)
    messages.push(message)
    const toolCalls = message.tool_calls || []
    if (!toolCalls.length) {
      return e.json(200, { reply: message.content || "Done." })
    }
    for (const toolCall of toolCalls) {
      const result = runTool(e.app, e.auth.id, toolCall.function.name, toolCall.function.arguments)
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) })
    }
  }

  throw new InternalServerError("Assistant exceeded its tool limit")
}, $apis.requireAuth("users"))
