import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/consulta", async (req, res) => {
  const { inscricao } = req.query;

  if (!inscricao) {
    return res.status(400).json({ error: "Insira a inscrição imobiliária." });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda/servicos/iptu/', { waitUntil: 'networkidle2' });

    // Exemplo de preenchimento (ajustar IDs corretos conforme o site real)
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
    await browser.close();
  }
});

app.get("/", (req, res) => {
  res.send("API de Valor Venal rodando!");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});