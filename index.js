const puppeteer = require('puppeteer');

const endDate = process.env.END_DATE || '2019-06-26';
const queueId = process.env.QUEUE_ID || 100;
const cityId = process.env.CITY_ID || 5;
const login = process.env.LOGIN || '';
const password = process.env.PASSWORD || '';
const pushMeToken = process.env.PUSH_ME_TOKEN || '';

(async () => {
  const browser = await puppeteer.launch({devtools: false, headless: true});

  const page = await browser.newPage()
  await page.setViewport({width: 1440, height: 789});
  const navigationPromise = page.waitForNavigation();

  await page.goto('https://rezerwacje.duw.pl/reservations/pol/login');
  await navigationPromise;

  await page.waitForSelector('.col > #LoginForm > .row > .input-field > #UserEmail');
  await page.type('.col > #LoginForm > .row > .input-field > #UserEmail', login);
  await page.type('.col > #LoginForm > .row > .input-field > #UserPassword', password);
  await page.click('.col > #LoginForm > .row > .row > .s3');
  await navigationPromise;


  await page.evaluate((cityId) => fetch("/reservations/locations/setCurrent", {
      body: 'id=' + cityId,
      headers: {
          "x-requested-with": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "post",
  }), cityId);

  page.evaluate(async (endDate, queueId, pushMeToken) => {
      function randomSleep(min, max) {
          return new Promise((resolve) => {
              setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min));
          });
      }
      const today = new Date();
      for (let i = 1; i <= 40; i++) {
          const d = new Date()
          d.setDate(today.getDate() + i);
          const date = d.toISOString().split('T')[0];
          const found = await fetch('/reservations/pol/queues/' + queueId + '/19/' + date, {
              "headers": {
                  "x-requested-with": "XMLHttpRequest"
              }
          }).then((res) => res.text()).then((res) => {
              if (!res.includes('/lock')) {
                  throw new Error('Wrong page')
              }
              return res.match(/\d+-\d+-\d+\ \d+:\d+:00/g)
          });
          if (found) {
              try {
                  await fetch('https://pushmeapi.jagcesar.se?identifier=' + pushMeToken + '&title=' + encodeURIComponent(found.join()));
              } catch (e) {}
              console.log(found);
          }
          if (date === endDate) {
              break;
          }
          await randomSleep(500, 2500);
      }
  }, endDate, queueId, pushMeToken).catch((e) => {
      console.log('ERR', e);
  }).then(async () => {
    await browser.close();
    process.exit(0);  
  });

})().catch((e) => {
  console.error(e);
  process.exit(1);
});