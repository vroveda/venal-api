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

  if (inscricao.length !== 11) {
    return res.status(400).json({ error: "Inscrição inválida. Use 11 dígitos, sem pontos ou traços." });
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

    // Acessar novo site
    await page.goto('https://itbi.prefeitura.sp.gov.br/valorereferencia/tvm/frm_tvm_consulta_valor.aspx', { waitUntil: 'networkidle2' });

    // Separar campos da inscrição
    const bloco1 = inscricao.slice(0, 3);
    const bloco2 = inscricao.slice(3, 6);
    const bloco3 = inscricao.slice(6, 10);
    const bloco4 = inscricao.slice(10);

    // Preencher inscrição
    await page.type('input[name="ctl00$cphBody$txtCadastro1"]', bloco1);
    await page.type('input[name="ctl00$cphBody$txtCadastro2"]', bloco2);
    await page.type('input[name="ctl00$cphBody$txtCadastro3"]', bloco3);
    await page.type('input[name="ctl00$cphBody$txtCadastro4"]', bloco4);

    // Preencher data automática (hoje)
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dataHoje = `${day}/${month}/${year}`;

    await page.type('input[name="ctl00$cphBody$txtDataBase"]', dataHoje);

    // Clicar no botão "Pesquisar"
    await Promise.all([
      page.click('input[name="ctl00$cphBody$btnPesquisar"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Capturar valor venal
    const valorVenal = await page.evaluate(() => {
      const td = document.querySelector('td[id*="lblValorVenal"]');
      return td ? td.innerText.trim() : null;
    });

    if (!valorVenal) {
      return res.status(404).json({ error: "Valor venal não encontrado." });
    }

    res.json({ inscricao, valorVenal, dataConsulta: dataHoje });

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
