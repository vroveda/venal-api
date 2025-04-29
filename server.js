import express from "express";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/consulta", async (req, res) => {
  const { inscricao } = req.query;

  if (!inscricao) {
    return res.status(400).json({ error: "Insira a inscrição imobiliária." });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda/servicos/iptu/', { waitUntil: 'networkidle2' });

    // Ajustar conforme IDs corretos
    await page.type('#campoInscricao', inscricao);
    await page.click('#botaoConsultar');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const valorVenal = await page.evaluate(() => {
      const elemento = document.querySelector('#valorVenal');
      return elemento ? elemento.textContent.trim() : null;
    });

    if (!valorVenal) {
      return res.status(404).json({ error: "Valor venal não encontrado" });
    }

    res.json({ inscricao, valorVenal });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno na consulta" });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
});

app.get("/", (req, res) => {
  res.send("API de Valor Venal otimizada rodando!");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});