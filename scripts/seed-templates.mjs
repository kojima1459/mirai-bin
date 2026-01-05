import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const templates = [
  // ===== 感情テンプレ（8本）=====
  {
    name: "bad-night",
    displayName: "うまくいかない夜へ",
    subtitle: "自信がなくなった時に読む手紙",
    category: "emotion",
    description: "自信を失い、孤独を感じている時に届ける手紙。親の経験と無条件の愛を伝える。",
    prompt: "子どもが自信を失い、孤独を感じている時に読む手紙を作成してください。親自身の失敗経験、それでも前に進めた理由、そして無条件の愛を伝えてください。",
    recordingPrompt: "お子さんが自信をなくした夜に読む手紙です。あなた自身の失敗経験、それでも前に進めた理由、そして「どんな時も味方だよ」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. あなた自身が自信を失った経験を1つ話す（30秒）",
      "2. それでも前に進めた理由や支えを話す（30秒）",
      "3. 「どんな時も味方だよ」という想いを伝える（30秒）"
    ]),
    exampleOneLiner: "パパも会社で大失敗して、3日間ベッドから出られなかったことがある。でもね、君がいてくれたから、また立ち上がれたんだ。",
    icon: "moon",
    isRecommended: true,
    sortOrder: 1
  },
  {
    name: "after-failure",
    displayName: "失敗して落ち込む君へ",
    subtitle: "挫折から立ち直るための言葉",
    category: "emotion",
    description: "大きな失敗や挫折を経験した時に届ける手紙。失敗は成長の証であることを伝える。",
    prompt: "子どもが大きな失敗や挫折を経験した時に読む手紙を作成してください。失敗は成長の証であること、親も同じ経験をしたこと、そして必ず乗り越えられることを伝えてください。",
    recordingPrompt: "お子さんが失敗して落ち込んでいる時に読む手紙です。失敗は悪いことじゃないこと、あなたの失敗談、そして「必ず乗り越えられる」という確信を90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 失敗は成長の証だと伝える（20秒）",
      "2. あなた自身の失敗と、そこから学んだことを話す（40秒）",
      "3. 「必ず乗り越えられる」という確信を伝える（30秒）"
    ]),
    exampleOneLiner: "受験に落ちた時、世界が終わったと思った。でも今思えば、あの失敗があったから今の仕事に出会えた。",
    icon: "trending-down",
    isRecommended: false,
    sortOrder: 10
  },
  {
    name: "anger-control",
    displayName: "怒りが抑えられない君へ",
    subtitle: "衝動と正義感の扱い方",
    category: "emotion",
    description: "怒りや衝動をコントロールできない時に届ける手紙。怒りの正体と向き合い方を伝える。",
    prompt: "子どもが怒りをコントロールできない時に読む手紙を作成してください。怒りは悪い感情ではないこと、その扱い方、そして親も同じ経験をしたことを伝えてください。",
    recordingPrompt: "お子さんが怒りを抑えられない時に読む手紙です。怒りは悪くないこと、あなたの怒りの経験、そして怒りとの付き合い方を90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 怒りは悪い感情じゃないと伝える（20秒）",
      "2. あなたが怒りに振り回された経験を話す（40秒）",
      "3. 怒りとの付き合い方（深呼吸、距離を置く等）を伝える（30秒）"
    ]),
    exampleOneLiner: "怒りは「大切なものを守りたい」という気持ちの裏返し。その気持ちは間違ってない。",
    icon: "flame",
    isRecommended: false,
    sortOrder: 11
  },
  {
    name: "friend-trouble",
    displayName: "友達がしんどい君へ",
    subtitle: "人間関係の疲れを癒す言葉",
    category: "emotion",
    description: "友人関係に疲れた時に届ける手紙。人間関係の距離感と自分を守ることの大切さを伝える。",
    prompt: "子どもが友人関係に疲れた時に読む手紙を作成してください。すべての人と仲良くする必要はないこと、自分を守ることの大切さ、そして親の経験を伝えてください。",
    recordingPrompt: "お子さんが友達関係で疲れている時に読む手紙です。全員と仲良くしなくていいこと、あなたの友人関係の経験、そして「自分を大切に」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 全員と仲良くする必要はないと伝える（20秒）",
      "2. あなたの友人関係での苦労や学びを話す（40秒）",
      "3. 「自分を大切にしていい」と伝える（30秒）"
    ]),
    exampleOneLiner: "本当の友達は、無理しなくても一緒にいられる人。そういう人が1人いれば十分。",
    icon: "users",
    isRecommended: false,
    sortOrder: 12
  },
  {
    name: "self-hate",
    displayName: "自分が嫌いになった君へ",
    subtitle: "自己否定から抜け出すための言葉",
    category: "emotion",
    description: "自分を嫌いになった時に届ける手紙。親から見た子どもの素晴らしさを伝える。",
    prompt: "子どもが自分を嫌いになった時に読む手紙を作成してください。親から見た子どもの素晴らしさ、存在そのものの価値、そして無条件の愛を伝えてください。",
    recordingPrompt: "お子さんが自分を嫌いになった時に読む手紙です。あなたから見たお子さんの素晴らしさ、存在そのものの価値、そして「生まれてきてくれてありがとう」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. お子さんの具体的な素晴らしさを3つ挙げる（30秒）",
      "2. 存在そのものに価値があると伝える（30秒）",
      "3. 「生まれてきてくれてありがとう」と伝える（30秒）"
    ]),
    exampleOneLiner: "君が生まれた日、パパは泣いた。こんなに完璧な存在がこの世にいるのかって。",
    icon: "heart-crack",
    isRecommended: true,
    sortOrder: 2
  },
  {
    name: "burnout",
    displayName: "頑張れない君へ",
    subtitle: "燃え尽きた時に読む手紙",
    category: "emotion",
    description: "頑張れない、無気力な時に届ける手紙。休むことの大切さと、頑張らなくても愛されることを伝える。",
    prompt: "子どもが燃え尽きて頑張れない時に読む手紙を作成してください。休むことの大切さ、頑張らなくても愛されること、そして親の経験を伝えてください。",
    recordingPrompt: "お子さんが頑張れない時に読む手紙です。休んでいいこと、頑張らなくても愛されること、そしてあなたの燃え尽き経験を90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 「休んでいい」と伝える（20秒）",
      "2. あなたの燃え尽き経験を話す（40秒）",
      "3. 頑張らなくても愛されることを伝える（30秒）"
    ]),
    exampleOneLiner: "頑張れない時は、体が「休め」って言ってるんだ。その声を無視しちゃダメ。",
    icon: "battery-low",
    isRecommended: false,
    sortOrder: 13
  },
  {
    name: "want-to-run",
    displayName: "逃げたい君へ",
    subtitle: "撤退の肯定と判断基準",
    category: "emotion",
    description: "逃げたいと思った時に届ける手紙。逃げることは悪くないこと、その判断基準を伝える。",
    prompt: "子どもが逃げたいと思った時に読む手紙を作成してください。逃げることは悪くないこと、逃げるべき時の判断基準、そして親の経験を伝えてください。",
    recordingPrompt: "お子さんが逃げたいと思った時に読む手紙です。逃げることは悪くないこと、あなたが逃げた経験、そして「逃げていい基準」を90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 逃げることは悪くないと伝える（20秒）",
      "2. あなたが逃げた経験を話す（40秒）",
      "3. 逃げていい基準（心身が壊れそうな時等）を伝える（30秒）"
    ]),
    exampleOneLiner: "逃げるのは負けじゃない。自分を守る勇気ある選択だ。",
    icon: "door-open",
    isRecommended: false,
    sortOrder: 14
  },
  {
    name: "big-decision",
    displayName: "大事な決断の前の君へ",
    subtitle: "選択と覚悟の支え",
    category: "emotion",
    description: "人生の大きな決断を前にした時に届ける手紙。決断の仕方と、どんな選択も応援することを伝える。",
    prompt: "子どもが人生の大きな決断を前にした時に読む手紙を作成してください。決断の仕方、後悔しない選び方、そしてどんな選択も応援することを伝えてください。",
    recordingPrompt: "お子さんが大きな決断を前にした時に読む手紙です。決断の仕方、あなたの人生の決断経験、そして「どんな選択も応援する」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 決断で大切なこと（直感、価値観等）を伝える（30秒）",
      "2. あなたの人生の決断経験を話す（30秒）",
      "3. 「どんな選択も応援する」と伝える（30秒）"
    ]),
    exampleOneLiner: "正解は誰にも分からない。でも、君が選んだ道を正解にする力が、君にはある。",
    icon: "compass",
    isRecommended: false,
    sortOrder: 15
  },

  // ===== 親の本音テンプレ（6本）=====
  {
    name: "apology",
    displayName: "謝りたいことがある",
    subtitle: "忙しさで言えなかったことを正直に残す",
    category: "parent-truth",
    description: "親として謝りたいこと、後悔していることを正直に伝える手紙。",
    prompt: "親として謝りたいこと、後悔していることを正直に伝える手紙を作成してください。具体的な出来事、その時の本当の気持ち、そして今の想いを伝えてください。",
    recordingPrompt: "お子さんに謝りたいことを伝える手紙です。具体的な出来事、その時の本当の気持ち、そして「ごめんね」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 謝りたい具体的な出来事を話す（30秒）",
      "2. その時の本当の気持ち（言い訳ではなく）を話す（30秒）",
      "3. 「ごめんね」と今の想いを伝える（30秒）"
    ]),
    exampleOneLiner: "仕事を言い訳にして、君の運動会に行けなかったこと、今でも後悔してる。",
    icon: "hand-heart",
    isRecommended: true,
    sortOrder: 3
  },
  {
    name: "love-you",
    displayName: "言葉にできなかった\"愛してる\"",
    subtitle: "直球の愛情を言葉にする",
    category: "parent-truth",
    description: "普段は言えない「愛してる」を直球で伝える手紙。",
    prompt: "普段は恥ずかしくて言えない「愛してる」を直球で伝える手紙を作成してください。子どもへの愛情、感謝、そして誇りを伝えてください。",
    recordingPrompt: "普段は言えない「愛してる」を伝える手紙です。お子さんへの愛情、感謝、そして誇りを90秒で話してください。恥ずかしがらずに。",
    recordingGuide: JSON.stringify([
      "1. 「愛してる」と直球で伝える（20秒）",
      "2. 具体的に愛おしいと思う瞬間を話す（40秒）",
      "3. 「君がいてくれて幸せ」と伝える（30秒）"
    ]),
    exampleOneLiner: "愛してる。この言葉、面と向かって言えなくてごめん。でも、毎日思ってる。",
    icon: "heart",
    isRecommended: false,
    sortOrder: 20
  },
  {
    name: "your-strengths",
    displayName: "君の\"すごいところ\"の記録",
    subtitle: "親が見つけた才能の芽",
    category: "parent-truth",
    description: "親から見た子どもの才能、強み、素晴らしいところを記録する手紙。",
    prompt: "親から見た子どもの才能、強み、素晴らしいところを具体的に記録する手紙を作成してください。観察した具体的なエピソードを交えて伝えてください。",
    recordingPrompt: "お子さんの「すごいところ」を記録する手紙です。あなたが観察した才能の芽、具体的なエピソード、そして「これは君の強みだ」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. お子さんの才能・強みを3つ挙げる（30秒）",
      "2. それを感じた具体的なエピソードを話す（40秒）",
      "3. 「これは君の武器になる」と伝える（20秒）"
    ]),
    exampleOneLiner: "君が友達の話を聞いてる時の顔、すごく優しいんだ。それは君の才能だよ。",
    icon: "sparkles",
    isRecommended: false,
    sortOrder: 21
  },
  {
    name: "family-secrets",
    displayName: "家族の秘密の地図",
    subtitle: "家系・価値観・なぜこの家なのか",
    category: "parent-truth",
    description: "家族の歴史、価値観、秘密を伝える手紙。子どもが自分のルーツを知るための地図。",
    prompt: "家族の歴史、価値観、知っておいてほしい秘密を伝える手紙を作成してください。子どもが自分のルーツを知り、誇りを持てるように伝えてください。",
    recordingPrompt: "家族の歴史と秘密を伝える手紙です。家系のこと、大切にしてきた価値観、そして「君に知っておいてほしいこと」を90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 家族の歴史・ルーツを話す（30秒）",
      "2. 大切にしてきた価値観を話す（30秒）",
      "3. 知っておいてほしい秘密や想いを伝える（30秒）"
    ]),
    exampleOneLiner: "おじいちゃんが戦後、裸一貫で会社を作った話、ちゃんと伝えておきたかった。",
    icon: "map",
    isRecommended: false,
    sortOrder: 22
  },
  {
    name: "money-talk",
    displayName: "君に伝えたいお金の話",
    subtitle: "破滅を避ける知恵",
    category: "parent-truth",
    description: "お金との付き合い方、失敗談、守ってほしいルールを伝える手紙。",
    prompt: "お金との付き合い方、親の失敗談、守ってほしいルールを伝える手紙を作成してください。説教ではなく、経験からの知恵として伝えてください。",
    recordingPrompt: "お金の話を伝える手紙です。あなたのお金の失敗談、学んだこと、そして「これだけは守って」というルールを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. あなたのお金の失敗談を話す（30秒）",
      "2. そこから学んだことを話す（30秒）",
      "3. 「これだけは守って」というルールを伝える（30秒）"
    ]),
    exampleOneLiner: "借金だけはするな。パパは20代で借金して、10年かかって返した。",
    icon: "wallet",
    isRecommended: false,
    sortOrder: 23
  },
  {
    name: "protect-yourself",
    displayName: "心と体を守る約束",
    subtitle: "境界線・危険回避の知恵",
    category: "parent-truth",
    description: "心と体を守るための約束、境界線の引き方、危険回避の知恵を伝える手紙。",
    prompt: "心と体を守るための約束、境界線の引き方、危険回避の知恵を伝える手紙を作成してください。性や同意についても丁寧な表現で伝えてください。",
    recordingPrompt: "心と体を守る約束を伝える手紙です。境界線の引き方、危険の見分け方、そして「自分を大切にして」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 「嫌なことは嫌と言っていい」と伝える（30秒）",
      "2. 危険の見分け方、避け方を話す（30秒）",
      "3. 「自分の心と体を大切にして」と伝える（30秒）"
    ]),
    exampleOneLiner: "「嫌だ」と言う勇気を持って。それは自分を守る最強の武器だから。",
    icon: "shield",
    isRecommended: false,
    sortOrder: 24
  },

  // ===== 儀式テンプレ（2本）=====
  {
    name: "ordinary-day",
    displayName: "節目じゃない普通の日の君へ",
    subtitle: "今日の君を、そのまま未来に渡す",
    category: "ritual",
    description: "特別な日ではない、普通の日の記録。日常の証拠として最も強い手紙。",
    prompt: "特別な日ではない、普通の日の記録として手紙を作成してください。今日の子どもの様子、日常の幸せ、そして「この瞬間を残したい」という想いを伝えてください。",
    recordingPrompt: "普通の日の記録を残す手紙です。今日のお子さんの様子、日常の幸せ、そして「この瞬間を未来に届けたい」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 今日のお子さんの様子を話す（30秒）",
      "2. 日常の中で感じる幸せを話す（30秒）",
      "3. 「この瞬間を届けたい」という想いを伝える（30秒）"
    ]),
    exampleOneLiner: "今日、君は朝ごはんのパンを3枚食べた。それだけで、パパは幸せだった。",
    icon: "sun",
    isRecommended: false,
    sortOrder: 30
  },
  {
    name: "when-you-become-parent",
    displayName: "いつか親になる君へ",
    subtitle: "親視点の継承",
    category: "ritual",
    description: "子どもがいつか親になった時に読む手紙。親としての経験と知恵を継承する。",
    prompt: "子どもがいつか親になった時に読む手紙を作成してください。親としての経験、苦労、喜び、そして「君なら大丈夫」という想いを伝えてください。",
    recordingPrompt: "お子さんがいつか親になった時に読む手紙です。親としての経験、苦労と喜び、そして「君なら大丈夫」という想いを90秒で話してください。",
    recordingGuide: JSON.stringify([
      "1. 親になって感じた喜びを話す（30秒）",
      "2. 親としての苦労と学びを話す（30秒）",
      "3. 「君なら大丈夫」と伝える（30秒）"
    ]),
    exampleOneLiner: "君を抱いた瞬間、「この子のためなら何でもできる」と思った。君もきっとそう思う。",
    icon: "baby",
    isRecommended: false,
    sortOrder: 31
  }
];

async function seedTemplates() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log("Seeding templates...");
    
    for (const template of templates) {
      // Check if template already exists
      const [existing] = await connection.execute(
        "SELECT id FROM templates WHERE name = ?",
        [template.name]
      );
      
      if (existing.length > 0) {
        // Update existing template
        await connection.execute(
          `UPDATE templates SET 
            displayName = ?, subtitle = ?, description = ?, category = ?,
            prompt = ?, recordingPrompt = ?, recordingGuide = ?,
            exampleOneLiner = ?, icon = ?, isRecommended = ?, sortOrder = ?
          WHERE name = ?`,
          [
            template.displayName, template.subtitle, template.description, template.category,
            template.prompt, template.recordingPrompt, template.recordingGuide,
            template.exampleOneLiner, template.icon, template.isRecommended, template.sortOrder,
            template.name
          ]
        );
        console.log(`Updated: ${template.displayName}`);
      } else {
        // Insert new template
        await connection.execute(
          `INSERT INTO templates 
            (name, displayName, subtitle, description, category, prompt, recordingPrompt, recordingGuide, exampleOneLiner, icon, isRecommended, sortOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            template.name, template.displayName, template.subtitle, template.description, template.category,
            template.prompt, template.recordingPrompt, template.recordingGuide,
            template.exampleOneLiner, template.icon, template.isRecommended, template.sortOrder
          ]
        );
        console.log(`Inserted: ${template.displayName}`);
      }
    }
    
    console.log("\nSeeding completed!");
    console.log(`Total templates: ${templates.length}`);
    
  } finally {
    await connection.end();
  }
}

seedTemplates().catch(console.error);
