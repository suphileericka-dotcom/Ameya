(async () => {
  try {
    const res = await fetch("https://translate.argosopentech.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: "hello",
        source: "auto",
        target: "fr",
        format: "text",
      }),
    });

    console.log("STATUS:", res.status);
    console.log("BODY:", await res.text());
  } catch (e) {
    console.error("FETCH FAILED:", e);
  }
})();
