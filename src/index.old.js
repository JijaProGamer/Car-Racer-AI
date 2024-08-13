const DQL = require("./DQL.js");
const brains = new DQL()

//let actions = ["w", "wa", "wd", "s", "sa", "sd", "shift+w", "shift+wa", "shift+wd", "shift+s", "shift+sa", "shift+sd"]
let actions = ["w", "wa", "wd"/*, "shift+w", "shift+wa", "shift+wd"*/]

const maxSteps = 10000;
const updateInterval = 8;

let stepsTotal = 0;
let steps = 0;
let episode = 0;
let episodeReward = 0;

let bestEpisode = -1;
let episodes = []

brains.makeModel(26, actions.length);
brains.memory.init(maxSteps);

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/*let track = {
  "segments": [],
  "startFinish": {
    "x1": 0,
    "x2": 0,
    "y1": 0,
    "y2": 0
  },
  "checkpoints": [],
  "carStart": {
    "x": 0,
    "y": 0,
    "angle": 0
  }
}*/

let track = {
  "segments": [
    {
      "x1": 0.17626953125,
      "x2": 0.1787109375,
      "y1": 0.591937069813176,
      "y2": 0.5427728613569321
    },
    {
      "x1": 0.1787109375,
      "x2": 0.1787109375,
      "y1": 0.5427728613569321,
      "y2": 0.4768928220255654
    },
    {
      "x1": 0.1787109375,
      "x2": 0.18505859375,
      "y1": 0.4768928220255654,
      "y2": 0.41297935103244837
    },
    {
      "x1": 0.18505859375,
      "x2": 0.1875,
      "y1": 0.41297935103244837,
      "y2": 0.3687315634218289
    },
    {
      "x1": 0.1875,
      "x2": 0.1904296875,
      "y1": 0.3687315634218289,
      "y2": 0.32350049164208455
    },
    {
      "x1": 0.1904296875,
      "x2": 0.19189453125,
      "y1": 0.32350049164208455,
      "y2": 0.3087512291052114
    },
    {
      "x1": 0.19189453125,
      "x2": 0.19873046875,
      "y1": 0.3087512291052114,
      "y2": 0.27630285152409045
    },
    {
      "x1": 0.19873046875,
      "x2": 0.22021484375,
      "y1": 0.27630285152409045,
      "y2": 0.23893805309734514
    },
    {
      "x1": 0.22021484375,
      "x2": 0.24462890625,
      "y1": 0.23893805309734514,
      "y2": 0.21632251720747295
    },
    {
      "x1": 0.24462890625,
      "x2": 0.28955078125,
      "y1": 0.21632251720747295,
      "y2": 0.20058997050147492
    },
    {
      "x1": 0.28955078125,
      "x2": 0.3173828125,
      "y1": 0.20058997050147492,
      "y2": 0.1927236971484759
    },
    {
      "x1": 0.3173828125,
      "x2": 0.375,
      "y1": 0.1927236971484759,
      "y2": 0.18584070796460178
    },
    {
      "x1": 0.375,
      "x2": 0.41796875,
      "y1": 0.18584070796460178,
      "y2": 0.1848574237954769
    },
    {
      "x1": 0.41796875,
      "x2": 0.4462890625,
      "y1": 0.1848574237954769,
      "y2": 0.1848574237954769
    },
    {
      "x1": 0.4462890625,
      "x2": 0.509765625,
      "y1": 0.1848574237954769,
      "y2": 0.18289085545722714
    },
    {
      "x1": 0.509765625,
      "x2": 0.55029296875,
      "y1": 0.18289085545722714,
      "y2": 0.18289085545722714
    },
    {
      "x1": 0.55029296875,
      "x2": 0.5869140625,
      "y1": 0.18289085545722714,
      "y2": 0.19174041297935104
    },
    {
      "x1": 0.5869140625,
      "x2": 0.623046875,
      "y1": 0.19174041297935104,
      "y2": 0.21337266470009833
    },
    {
      "x1": 0.623046875,
      "x2": 0.64208984375,
      "y1": 0.21337266470009833,
      "y2": 0.23893805309734514
    },
    {
      "x1": 0.64208984375,
      "x2": 0.65234375,
      "y1": 0.23893805309734514,
      "y2": 0.2723697148475909
    },
    {
      "x1": 0.65234375,
      "x2": 0.654296875,
      "y1": 0.2723697148475909,
      "y2": 0.2949852507374631
    },
    {
      "x1": 0.654296875,
      "x2": 0.642578125,
      "y1": 0.2949852507374631,
      "y2": 0.3303834808259587
    },
    {
      "x1": 0.642578125,
      "x2": 0.6279296875,
      "y1": 0.3303834808259587,
      "y2": 0.3559488692232055
    },
    {
      "x1": 0.6279296875,
      "x2": 0.60546875,
      "y1": 0.3559488692232055,
      "y2": 0.3815142576204523
    },
    {
      "x1": 0.60546875,
      "x2": 0.57177734375,
      "y1": 0.3815142576204523,
      "y2": 0.4031465093411996
    },
    {
      "x1": 0.57177734375,
      "x2": 0.53466796875,
      "y1": 0.4031465093411996,
      "y2": 0.4247787610619469
    },
    {
      "x1": 0.53466796875,
      "x2": 0.482421875,
      "y1": 0.4247787610619469,
      "y2": 0.44542772861356933
    },
    {
      "x1": 0.482421875,
      "x2": 0.46875,
      "y1": 0.44542772861356933,
      "y2": 0.45624385447394294
    },
    {
      "x1": 0.46875,
      "x2": 0.4541015625,
      "y1": 0.45624385447394294,
      "y2": 0.4808259587020649
    },
    {
      "x1": 0.4541015625,
      "x2": 0.453125,
      "y1": 0.4808259587020649,
      "y2": 0.49557522123893805
    },
    {
      "x1": 0.453125,
      "x2": 0.462890625,
      "y1": 0.49557522123893805,
      "y2": 0.5172074729596854
    },
    {
      "x1": 0.462890625,
      "x2": 0.51416015625,
      "y1": 0.5172074729596854,
      "y2": 0.52015732546706
    },
    {
      "x1": 0.51416015625,
      "x2": 0.57861328125,
      "y1": 0.52015732546706,
      "y2": 0.511307767944936
    },
    {
      "x1": 0.57861328125,
      "x2": 0.61962890625,
      "y1": 0.511307767944936,
      "y2": 0.4995083579154376
    },
    {
      "x1": 0.61962890625,
      "x2": 0.67041015625,
      "y1": 0.4995083579154376,
      "y2": 0.46509341199606685
    },
    {
      "x1": 0.67041015625,
      "x2": 0.689453125,
      "y1": 0.46509341199606685,
      "y2": 0.44051130776794495
    },
    {
      "x1": 0.689453125,
      "x2": 0.71630859375,
      "y1": 0.44051130776794495,
      "y2": 0.4277286135693215
    },
    {
      "x1": 0.71630859375,
      "x2": 0.759765625,
      "y1": 0.4277286135693215,
      "y2": 0.41494591937069814
    },
    {
      "x1": 0.759765625,
      "x2": 0.77783203125,
      "y1": 0.41494591937069814,
      "y2": 0.41494591937069814
    },
    {
      "x1": 0.77783203125,
      "x2": 0.80712890625,
      "y1": 0.41494591937069814,
      "y2": 0.42379547689282204
    },
    {
      "x1": 0.80712890625,
      "x2": 0.861328125,
      "y1": 0.42379547689282204,
      "y2": 0.49557522123893805
    },
    {
      "x1": 0.861328125,
      "x2": 0.86279296875,
      "y1": 0.49557522123893805,
      "y2": 0.49852507374631266
    },
    {
      "x1": 0.86279296875,
      "x2": 0.884765625,
      "y1": 0.49852507374631266,
      "y2": 0.5791543756145526
    },
    {
      "x1": 0.884765625,
      "x2": 0.8916015625,
      "y1": 0.5791543756145526,
      "y2": 0.6450344149459194
    },
    {
      "x1": 0.8916015625,
      "x2": 0.888671875,
      "y1": 0.6450344149459194,
      "y2": 0.711897738446411
    },
    {
      "x1": 0.888671875,
      "x2": 0.87744140625,
      "y1": 0.711897738446411,
      "y2": 0.7738446411012783
    },
    {
      "x1": 0.87744140625,
      "x2": 0.85595703125,
      "y1": 0.7738446411012783,
      "y2": 0.8102261553588987
    },
    {
      "x1": 0.85595703125,
      "x2": 0.8203125,
      "y1": 0.8102261553588987,
      "y2": 0.8377581120943953
    },
    {
      "x1": 0.8203125,
      "x2": 0.798828125,
      "y1": 0.8377581120943953,
      "y2": 0.8574237954768928
    },
    {
      "x1": 0.798828125,
      "x2": 0.775390625,
      "y1": 0.8574237954768928,
      "y2": 0.8790560471976401
    },
    {
      "x1": 0.775390625,
      "x2": 0.72119140625,
      "y1": 0.8790560471976401,
      "y2": 0.8928220255653884
    },
    {
      "x1": 0.72119140625,
      "x2": 0.63330078125,
      "y1": 0.8928220255653884,
      "y2": 0.8977384464110127
    },
    {
      "x1": 0.63330078125,
      "x2": 0.57275390625,
      "y1": 0.8977384464110127,
      "y2": 0.8898721730580138
    },
    {
      "x1": 0.57275390625,
      "x2": 0.52587890625,
      "y1": 0.8898721730580138,
      "y2": 0.8820058997050148
    },
    {
      "x1": 0.52587890625,
      "x2": 0.3984375,
      "y1": 0.8820058997050148,
      "y2": 0.8741396263520157
    },
    {
      "x1": 0.3984375,
      "x2": 0.33203125,
      "y1": 0.8741396263520157,
      "y2": 0.8682399213372665
    },
    {
      "x1": 0.33203125,
      "x2": 0.2861328125,
      "y1": 0.8682399213372665,
      "y2": 0.8623402163225172
    },
    {
      "x1": 0.2861328125,
      "x2": 0.20166015625,
      "y1": 0.8623402163225172,
      "y2": 0.8544739429695182
    },
    {
      "x1": 0.20166015625,
      "x2": 0.17431640625,
      "y1": 0.8544739429695182,
      "y2": 0.823992133726647
    },
    {
      "x1": 0.17431640625,
      "x2": 0.162109375,
      "y1": 0.823992133726647,
      "y2": 0.7630285152409046
    },
    {
      "x1": 0.162109375,
      "x2": 0.16162109375,
      "y1": 0.7630285152409046,
      "y2": 0.6902654867256637
    },
    {
      "x1": 0.16162109375,
      "x2": 0.17138671875,
      "y1": 0.6902654867256637,
      "y2": 0.6214355948869223
    },
    {
      "x1": 0.17138671875,
      "x2": 0.17138671875,
      "y1": 0.6214355948869223,
      "y2": 0.599803343166175
    },
    {
      "x1": 0.17138671875,
      "x2": 0.1748046875,
      "y1": 0.599803343166175,
      "y2": 0.5880039331366765
    },
    {
      "x1": 0.1748046875,
      "x2": 0.17626953125,
      "y1": 0.5880039331366765,
      "y2": 0.5850540806293019
    },
    {
      "x1": 0.2255859375,
      "x2": 0.228515625,
      "y1": 0.46607669616519176,
      "y2": 0.42379547689282204
    },
    {
      "x1": 0.228515625,
      "x2": 0.234375,
      "y1": 0.42379547689282204,
      "y2": 0.3854473942969518
    },
    {
      "x1": 0.234375,
      "x2": 0.240234375,
      "y1": 0.3854473942969518,
      "y2": 0.3608652900688299
    },
    {
      "x1": 0.240234375,
      "x2": 0.2529296875,
      "y1": 0.3608652900688299,
      "y2": 0.33136676499508355
    },
    {
      "x1": 0.2529296875,
      "x2": 0.26513671875,
      "y1": 0.33136676499508355,
      "y2": 0.3048180924287119
    },
    {
      "x1": 0.26513671875,
      "x2": 0.2763671875,
      "y1": 0.3048180924287119,
      "y2": 0.2871189773844641
    },
    {
      "x1": 0.2763671875,
      "x2": 0.30908203125,
      "y1": 0.2871189773844641,
      "y2": 0.2743362831858407
    },
    {
      "x1": 0.30908203125,
      "x2": 0.337890625,
      "y1": 0.2743362831858407,
      "y2": 0.2664700098328417
    },
    {
      "x1": 0.337890625,
      "x2": 0.36865234375,
      "y1": 0.2664700098328417,
      "y2": 0.2586037364798427
    },
    {
      "x1": 0.36865234375,
      "x2": 0.40234375,
      "y1": 0.2586037364798427,
      "y2": 0.255653883972468
    },
    {
      "x1": 0.40234375,
      "x2": 0.447265625,
      "y1": 0.255653883972468,
      "y2": 0.2487708947885939
    },
    {
      "x1": 0.447265625,
      "x2": 0.486328125,
      "y1": 0.2487708947885939,
      "y2": 0.24582104228121926
    },
    {
      "x1": 0.486328125,
      "x2": 0.51513671875,
      "y1": 0.24582104228121926,
      "y2": 0.2448377581120944
    },
    {
      "x1": 0.51513671875,
      "x2": 0.537109375,
      "y1": 0.2448377581120944,
      "y2": 0.24778761061946902
    },
    {
      "x1": 0.537109375,
      "x2": 0.568359375,
      "y1": 0.24778761061946902,
      "y2": 0.26843657817109146
    },
    {
      "x1": 0.568359375,
      "x2": 0.57666015625,
      "y1": 0.26843657817109146,
      "y2": 0.2910521140609636
    },
    {
      "x1": 0.57666015625,
      "x2": 0.576171875,
      "y1": 0.2910521140609636,
      "y2": 0.31170108161258603
    },
    {
      "x1": 0.576171875,
      "x2": 0.5576171875,
      "y1": 0.31170108161258603,
      "y2": 0.3352999016715831
    },
    {
      "x1": 0.5576171875,
      "x2": 0.53515625,
      "y1": 0.3352999016715831,
      "y2": 0.3480825958702065
    },
    {
      "x1": 0.53515625,
      "x2": 0.50830078125,
      "y1": 0.3480825958702065,
      "y2": 0.3529990167158309
    },
    {
      "x1": 0.50830078125,
      "x2": 0.49072265625,
      "y1": 0.3529990167158309,
      "y2": 0.35889872173058013
    },
    {
      "x1": 0.49072265625,
      "x2": 0.47265625,
      "y1": 0.35889872173058013,
      "y2": 0.37168141592920356
    },
    {
      "x1": 0.47265625,
      "x2": 0.44921875,
      "y1": 0.37168141592920356,
      "y2": 0.39331366764995085
    },
    {
      "x1": 0.44921875,
      "x2": 0.43701171875,
      "y1": 0.39331366764995085,
      "y2": 0.41297935103244837
    },
    {
      "x1": 0.43701171875,
      "x2": 0.42724609375,
      "y1": 0.41297935103244837,
      "y2": 0.44051130776794495
    },
    {
      "x1": 0.42724609375,
      "x2": 0.416015625,
      "y1": 0.44051130776794495,
      "y2": 0.4759095378564405
    },
    {
      "x1": 0.416015625,
      "x2": 0.41064453125,
      "y1": 0.4759095378564405,
      "y2": 0.5083579154375615
    },
    {
      "x1": 0.41064453125,
      "x2": 0.40966796875,
      "y1": 0.5083579154375615,
      "y2": 0.5270403146509341
    },
    {
      "x1": 0.40966796875,
      "x2": 0.4091796875,
      "y1": 0.5270403146509341,
      "y2": 0.5506391347099312
    },
    {
      "x1": 0.4091796875,
      "x2": 0.4130859375,
      "y1": 0.5506391347099312,
      "y2": 0.5663716814159292
    },
    {
      "x1": 0.4130859375,
      "x2": 0.42578125,
      "y1": 0.5663716814159292,
      "y2": 0.5860373647984267
    },
    {
      "x1": 0.42578125,
      "x2": 0.453125,
      "y1": 0.5860373647984267,
      "y2": 0.5909537856440511
    },
    {
      "x1": 0.453125,
      "x2": 0.4951171875,
      "y1": 0.5909537856440511,
      "y2": 0.5929203539823009
    },
    {
      "x1": 0.4951171875,
      "x2": 0.52734375,
      "y1": 0.5929203539823009,
      "y2": 0.5929203539823009
    },
    {
      "x1": 0.52734375,
      "x2": 0.57666015625,
      "y1": 0.5929203539823009,
      "y2": 0.5899705014749262
    },
    {
      "x1": 0.57666015625,
      "x2": 0.59716796875,
      "y1": 0.5899705014749262,
      "y2": 0.584070796460177
    },
    {
      "x1": 0.59716796875,
      "x2": 0.625,
      "y1": 0.584070796460177,
      "y2": 0.5771878072763028
    },
    {
      "x1": 0.625,
      "x2": 0.6689453125,
      "y1": 0.5771878072763028,
      "y2": 0.5712881022615536
    },
    {
      "x1": 0.6689453125,
      "x2": 0.68359375,
      "y1": 0.5712881022615536,
      "y2": 0.5663716814159292
    },
    {
      "x1": 0.68359375,
      "x2": 0.70703125,
      "y1": 0.5663716814159292,
      "y2": 0.5594886922320551
    },
    {
      "x1": 0.70703125,
      "x2": 0.73828125,
      "y1": 0.5594886922320551,
      "y2": 0.551622418879056
    },
    {
      "x1": 0.73828125,
      "x2": 0.75146484375,
      "y1": 0.551622418879056,
      "y2": 0.5526057030481809
    },
    {
      "x1": 0.75146484375,
      "x2": 0.763671875,
      "y1": 0.5526057030481809,
      "y2": 0.551622418879056
    },
    {
      "x1": 0.763671875,
      "x2": 0.7763671875,
      "y1": 0.551622418879056,
      "y2": 0.5506391347099312
    },
    {
      "x1": 0.7763671875,
      "x2": 0.79345703125,
      "y1": 0.5506391347099312,
      "y2": 0.5555555555555556
    },
    {
      "x1": 0.79345703125,
      "x2": 0.80712890625,
      "y1": 0.5555555555555556,
      "y2": 0.5850540806293019
    },
    {
      "x1": 0.80712890625,
      "x2": 0.8125,
      "y1": 0.5850540806293019,
      "y2": 0.6125860373647984
    },
    {
      "x1": 0.8125,
      "x2": 0.81494140625,
      "y1": 0.6125860373647984,
      "y2": 0.6588003933136677
    },
    {
      "x1": 0.81494140625,
      "x2": 0.818359375,
      "y1": 0.6588003933136677,
      "y2": 0.7177974434611603
    },
    {
      "x1": 0.818359375,
      "x2": 0.810546875,
      "y1": 0.7177974434611603,
      "y2": 0.7433628318584071
    },
    {
      "x1": 0.810546875,
      "x2": 0.78515625,
      "y1": 0.7433628318584071,
      "y2": 0.7905604719764012
    },
    {
      "x1": 0.78515625,
      "x2": 0.744140625,
      "y1": 0.7905604719764012,
      "y2": 0.8033431661750245
    },
    {
      "x1": 0.744140625,
      "x2": 0.71240234375,
      "y1": 0.8033431661750245,
      "y2": 0.8112094395280236
    },
    {
      "x1": 0.71240234375,
      "x2": 0.6640625,
      "y1": 0.8112094395280236,
      "y2": 0.8259587020648967
    },
    {
      "x1": 0.6640625,
      "x2": 0.6279296875,
      "y1": 0.8259587020648967,
      "y2": 0.8279252704031466
    },
    {
      "x1": 0.6279296875,
      "x2": 0.56982421875,
      "y1": 0.8279252704031466,
      "y2": 0.8279252704031466
    },
    {
      "x1": 0.56982421875,
      "x2": 0.52001953125,
      "y1": 0.8279252704031466,
      "y2": 0.8298918387413963
    },
    {
      "x1": 0.52001953125,
      "x2": 0.453125,
      "y1": 0.8298918387413963,
      "y2": 0.8259587020648967
    },
    {
      "x1": 0.453125,
      "x2": 0.41357421875,
      "y1": 0.8259587020648967,
      "y2": 0.8230088495575221
    },
    {
      "x1": 0.41357421875,
      "x2": 0.361328125,
      "y1": 0.8230088495575221,
      "y2": 0.8141592920353983
    },
    {
      "x1": 0.361328125,
      "x2": 0.318359375,
      "y1": 0.8141592920353983,
      "y2": 0.8043264503441495
    },
    {
      "x1": 0.318359375,
      "x2": 0.28662109375,
      "y1": 0.8043264503441495,
      "y2": 0.7944936086529006
    },
    {
      "x1": 0.28662109375,
      "x2": 0.2666015625,
      "y1": 0.7944936086529006,
      "y2": 0.7689282202556539
    },
    {
      "x1": 0.2666015625,
      "x2": 0.24609375,
      "y1": 0.7689282202556539,
      "y2": 0.7384464110127827
    },
    {
      "x1": 0.24609375,
      "x2": 0.236328125,
      "y1": 0.7384464110127827,
      "y2": 0.7030481809242871
    },
    {
      "x1": 0.236328125,
      "x2": 0.23046875,
      "y1": 0.7030481809242871,
      "y2": 0.6666666666666666
    },
    {
      "x1": 0.23046875,
      "x2": 0.22802734375,
      "y1": 0.6666666666666666,
      "y2": 0.6361848574237955
    },
    {
      "x1": 0.22802734375,
      "x2": 0.22802734375,
      "y1": 0.6361848574237955,
      "y2": 0.615535889872173
    },
    {
      "x1": 0.22802734375,
      "x2": 0.2265625,
      "y1": 0.615535889872173,
      "y2": 0.5860373647984267
    },
    {
      "x1": 0.2265625,
      "x2": 0.22607421875,
      "y1": 0.5860373647984267,
      "y2": 0.5594886922320551
    },
    {
      "x1": 0.22607421875,
      "x2": 0.22607421875,
      "y1": 0.5594886922320551,
      "y2": 0.5152409046214356
    },
    {
      "x1": 0.22607421875,
      "x2": 0.224609375,
      "y1": 0.5152409046214356,
      "y2": 0.48770894788593905
    },
    {
      "x1": 0.224609375,
      "x2": 0.224609375,
      "y1": 0.48770894788593905,
      "y2": 0.47099311701081614
    },
    {
      "x1": 0.224609375,
      "x2": 0.224609375,
      "y1": 0.47099311701081614,
      "y2": 0.4611602753195674
    },
    {
      "x1": 0.224609375,
      "x2": 0.2255859375,
      "y1": 0.4611602753195674,
      "y2": 0.4611602753195674
    }
  ],
  "startFinish": {
    "x1": 0.18115234375,
    "x2": 0.2265625,
    "y1": 0.44542772861356933,
    "y2": 0.44837758112094395
  },
  "checkpoints": [
    {
      "x1": 0.18798828125,
      "x2": 0.24169921875,
      "y1": 0.3470993117010816,
      "y2": 0.3500491642084562
    },
    {
      "x1": 0.2177734375,
      "x2": 0.2646484375,
      "y1": 0.24090462143559488,
      "y2": 0.29891838741396265
    },
    {
      "x1": 0.29736328125,
      "x2": 0.29833984375,
      "y1": 0.1976401179941003,
      "y2": 0.2753195673549656
    },
    {
      "x1": 0.36376953125,
      "x2": 0.36767578125,
      "y1": 0.1848574237954769,
      "y2": 0.25467059980334317
    },
    {
      "x1": 0.41015625,
      "x2": 0.41259765625,
      "y1": 0.18190757128810225,
      "y2": 0.25172074729596855
    },
    {
      "x1": 0.482421875,
      "x2": 0.48291015625,
      "y1": 0.18584070796460178,
      "y2": 0.24385447394296952
    },
    {
      "x1": 0.55224609375,
      "x2": 0.54638671875,
      "y1": 0.18190757128810225,
      "y2": 0.2497541789577188
    },
    {
      "x1": 0.62890625,
      "x2": 0.572265625,
      "y1": 0.2153392330383481,
      "y2": 0.2753195673549656
    },
    {
      "x1": 0.65283203125,
      "x2": 0.57373046875,
      "y1": 0.27925270403146507,
      "y2": 0.3028515240904621
    },
    {
      "x1": 0.58056640625,
      "x2": 0.5537109375,
      "y1": 0.3992133726647001,
      "y2": 0.3382497541789577
    },
    {
      "x1": 0.49365234375,
      "x2": 0.47265625,
      "y1": 0.4385447394296952,
      "y2": 0.3667649950835792
    },
    {
      "x1": 0.45263671875,
      "x2": 0.41162109375,
      "y1": 0.4936086529006883,
      "y2": 0.5093411996066863
    },
    {
      "x1": 0.47412109375,
      "x2": 0.4638671875,
      "y1": 0.5152409046214356,
      "y2": 0.5909537856440511
    },
    {
      "x1": 0.525390625,
      "x2": 0.5244140625,
      "y1": 0.5172074729596854,
      "y2": 0.5948869223205506
    },
    {
      "x1": 0.58154296875,
      "x2": 0.583984375,
      "y1": 0.5093411996066863,
      "y2": 0.5860373647984267
    },
    {
      "x1": 0.6474609375,
      "x2": 0.646484375,
      "y1": 0.4778761061946903,
      "y2": 0.5771878072763028
    },
    {
      "x1": 0.6923828125,
      "x2": 0.7099609375,
      "y1": 0.4385447394296952,
      "y2": 0.5545722713864307
    },
    {
      "x1": 0.7587890625,
      "x2": 0.759765625,
      "y1": 0.4169124877089479,
      "y2": 0.5476892822025565
    },
    {
      "x1": 0.8271484375,
      "x2": 0.79248046875,
      "y1": 0.44936086529006886,
      "y2": 0.5526057030481809
    },
    {
      "x1": 0.8076171875,
      "x2": 0.88037109375,
      "y1": 0.5889872173058014,
      "y2": 0.5585054080629301
    },
    {
      "x1": 0.814453125,
      "x2": 0.89111328125,
      "y1": 0.6686332350049164,
      "y2": 0.6529006882989183
    },
    {
      "x1": 0.8095703125,
      "x2": 0.849609375,
      "y1": 0.7433628318584071,
      "y2": 0.8112094395280236
    },
    {
      "x1": 0.81787109375,
      "x2": 0.88671875,
      "y1": 0.7138643067846607,
      "y2": 0.7079646017699115
    },
    {
      "x1": 0.75341796875,
      "x2": 0.77392578125,
      "y1": 0.80039331366765,
      "y2": 0.8780727630285152
    },
    {
      "x1": 0.78662109375,
      "x2": 0.80859375,
      "y1": 0.7935103244837758,
      "y2": 0.8407079646017699
    },
    {
      "x1": 0.6748046875,
      "x2": 0.6796875,
      "y1": 0.8220255653883972,
      "y2": 0.8928220255653884
    },
    {
      "x1": 0.7177734375,
      "x2": 0.7216796875,
      "y1": 0.8082595870206489,
      "y2": 0.8869223205506391
    },
    {
      "x1": 0.6015625,
      "x2": 0.591796875,
      "y1": 0.8279252704031466,
      "y2": 0.8908554572271387
    },
    {
      "x1": 0.53515625,
      "x2": 0.52734375,
      "y1": 0.8259587020648967,
      "y2": 0.880039331366765
    },
    {
      "x1": 0.4609375,
      "x2": 0.45849609375,
      "y1": 0.8249754178957719,
      "y2": 0.8770894788593904
    },
    {
      "x1": 0.3896484375,
      "x2": 0.3857421875,
      "y1": 0.8171091445427728,
      "y2": 0.8682399213372665
    },
    {
      "x1": 0.3251953125,
      "x2": 0.306640625,
      "y1": 0.8023598820058997,
      "y2": 0.8633235004916421
    },
    {
      "x1": 0.27392578125,
      "x2": 0.2548828125,
      "y1": 0.7787610619469026,
      "y2": 0.856440511307768
    },
    {
      "x1": 0.2470703125,
      "x2": 0.16015625,
      "y1": 0.7433628318584071,
      "y2": 0.7581120943952803
    },
    {
      "x1": 0.228515625,
      "x2": 0.16796875,
      "y1": 0.647984267453294,
      "y2": 0.6381514257620452
    },
    {
      "x1": 0.1796875,
      "x2": 0.224609375,
      "y1": 0.5329400196656834,
      "y2": 0.5349065880039331
    },
    {
      "x1": 0.1796875,
      "x2": 0.2236328125,
      "y1": 0.4582104228121927,
      "y2": 0.4611602753195674
    }
  ],
  "carStart": {
    "x": 0.208984375,
    "y": 0.3952802359882006,
    "angle": -65
  }
}

const car = {
  x: track.carStart.x * canvas.width,
  y: track.carStart.y * canvas.height,
  width: 35,
  height: 20,
  angle: track.carStart.angle,
  speed: 0,
  maxSpeed: 2,
  acceleration: 0.025,
  friction: 0.05,
  turnSpeed: 2.5
};

const manualDirection = {
  brake: false,
  w: false,
  a: false,
  s: false,
  d: false
};

let clickState = {
  startX: null,
  startY: null,
  mode: 'segment'
};

document.addEventListener('keydown', (e) => {
  if (e.shiftKey) manualDirection.brake = true;
  if (e.key.toLowerCase() === 'w') manualDirection.w = true;
  if (e.key.toLowerCase() === 'a') manualDirection.a = true;
  if (e.key.toLowerCase() === 's') manualDirection.s = true;
  if (e.key.toLowerCase() === 'd') manualDirection.d = true;

  if (e.key.toLowerCase() === 'c') {
    {
      clickState.startX = null;
      clickState.startY = null;

      switch (clickState.mode) {
        case "segment":
          clickState.mode = "checkpoint";
          break;
        case "checkpoint":
          clickState.mode = "segment";
          break;
      }
    }
  }

  if (e.key.toLowerCase() === "f") {
    clickState.startX = null;
    clickState.startY = null;

    clickState.mode = "startFinish"
  }
});

document.addEventListener('keyup', (e) => {
  if (!e.shiftKey) manualDirection.brake = false;
  if (e.key.toLowerCase() === 'w') manualDirection.w = false;
  if (e.key.toLowerCase() === 'a') manualDirection.a = false;
  if (e.key.toLowerCase() === 's') manualDirection.s = false;
  if (e.key.toLowerCase() === 'd') manualDirection.d = false;
});

let buttons = []
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / canvas.width;
  const y = (e.clientY - rect.top) / canvas.height;

  // activate buttons
  
  let clickedButton = false;
  for(let button of buttons){
    if((x * canvas.width) >= button.x && (y * canvas.height) >= button.y && (x * canvas.width) <= button.x + button.width && (y * canvas.height) <= button.y + button.height){
      button.func();
      clickedButton = true;
      break;
    }
  }

  if(clickedButton) return;

  // set car start position

  if (track.carStart.x == 0) {
    if (clickState.startX === null) {
      clickState.startX = x;
      clickState.startY = y;
    } else {
      track.carStart.x = x;
      track.carStart.y = y;

      let startVector = [x - clickState.startX, y - clickState.startY];
      let startMagnitude = Math.sqrt(startVector[0] * startVector[0] + startVector[1] * startVector[1]);
      let normVec = [startVector[0] / startMagnitude, startVector[1] / startMagnitude];

      //track.carStart.angle = normVec[1] * 180;//Math.acos(normVec[0]) * 180;

      clickState.startX = null;
      clickState.startY = null;
    }

    return;
  }

  if (clickState.startX === null) {
    clickState.startX = x;
    clickState.startY = y;
  } else {
    switch (clickState.mode) {
      case "segment":
        track.segments.push({ x1: clickState.startX, x2: x, y1: clickState.startY, y2: y });

        clickState.startX = x;
        clickState.startY = y;
        break;
      case "checkpoint":
        track.checkpoints.push({ x1: clickState.startX, x2: x, y1: clickState.startY, y2: y });

        clickState.startX = null;
        clickState.startY = null;
        break;
      case "startFinish":
        track.startFinish = { x1: clickState.startX, x2: x, y1: clickState.startY, y2: y };

        finalizeTrack();
        break;
    }
  }
});

function finalizeTrack() {
  console.log('Track data:', JSON.stringify(track, null, 2));
}

function draw(raycasts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Segments

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;

  track.segments.forEach(segment => {
    ctx.beginPath();

    ctx.lineTo(segment.x1 * canvas.width, segment.y1 * canvas.height);
    ctx.lineTo(segment.x2 * canvas.width, segment.y2 * canvas.height);

    ctx.stroke();
  });

  // Start/Finish line

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 5;
  if (track.startFinish.x1 !== undefined && track.startFinish.y1 !== undefined) {
    ctx.beginPath();

    ctx.moveTo(track.startFinish.x1 * canvas.width, track.startFinish.y1 * canvas.height);
    ctx.lineTo(track.startFinish.x2 * canvas.width, track.startFinish.y2 * canvas.height);

    ctx.stroke();
  }

  // Draw checkpoints

  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 3;

  track.checkpoints.forEach(checkpoint => {
    ctx.beginPath();

    ctx.lineTo(checkpoint.x1 * canvas.width, checkpoint.y1 * canvas.height);
    ctx.lineTo(checkpoint.x2 * canvas.width, checkpoint.y2 * canvas.height);

    ctx.stroke();
  });

  // Draw starting point of the car

  ctx.fillStyle = 'orange';
  if (track.carStart.x !== undefined && track.carStart.y !== undefined) {
    ctx.beginPath();
    ctx.arc(track.carStart.x * canvas.width, track.carStart.y * canvas.height, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw the raycasts

  ctx.strokeStyle = 'gray';
  ctx.lineWidth = 1;

  raycasts.forEach(raycast => {
    ctx.beginPath();

    ctx.lineTo(raycast.x1 * canvas.width, raycast.y1 * canvas.height);
    ctx.lineTo(raycast.x2 * canvas.width, raycast.y2 * canvas.height);

    ctx.stroke();
  });


  // Draw car

  const rad = car.angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const halfWidth = car.width / 2;
  const halfHeight = car.height / 2;

  const x1 = car.x + (-halfWidth * cos - -halfHeight * sin);
  const y1 = car.y + (-halfWidth * sin + -halfHeight * cos);

  const x2 = car.x + (halfWidth * cos - -halfHeight * sin);
  const y2 = car.y + (halfWidth * sin + -halfHeight * cos);

  const x3 = car.x + (halfWidth * cos - halfHeight * sin);
  const y3 = car.y + (halfWidth * sin + halfHeight * cos);

  const x4 = car.x + (-halfWidth * cos - halfHeight * sin);
  const y4 = car.y + (-halfWidth * sin + halfHeight * cos);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();

  ctx.fillStyle = 'purple';
  ctx.fill();
}

function update(direction) {
  if (direction.w) {
    if (!direction.brake) {
      car.speed += car.acceleration / 2;
    } else {
      car.speed += car.acceleration;
    }
  } else if (direction.s) {
    if (!direction.brake) {
      car.speed -= car.acceleration / 2;
    } else {
      car.speed -= car.acceleration;
    }  } else {
    if (car.speed > 0) {
      car.speed -= car.friction;
      if (car.speed < 0) car.speed = 0;
    }
    if (car.speed < 0) {
      car.speed += car.friction;
      if (car.speed > 0) car.speed = 0;
    }
  }

  if (direction.brake) {
    if (car.speed > car.maxSpeed / 2) car.speed = car.maxSpeed / 2;
    if (car.speed < -car.maxSpeed / 2) car.speed = -car.maxSpeed / 2;
  } else {
    if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
    if (car.speed < -car.maxSpeed) car.speed = -car.maxSpeed;
  }

  if (direction.a) {
    car.angle -= car.turnSpeed * (car.speed / car.maxSpeed);
  }
  if (direction.d) {
    car.angle += car.turnSpeed * (car.speed / car.maxSpeed);
  }

  car.x += Math.cos(car.angle * Math.PI / 180) * car.speed;
  car.y += Math.sin(car.angle * Math.PI / 180) * car.speed;

  if (car.x > canvas.width) car.x = 0;
  if (car.x < 0) car.x = canvas.width;
  if (car.y > canvas.height) car.y = 0;
  if (car.y < 0) car.y = canvas.height;
}

let lastState
let moveData = {
  lastCheckpoint: -1
}

async function reset(state, action, isIntersection) {
  car.x = track.carStart.x * canvas.width;
  car.y = track.carStart.y * canvas.height;
  car.angle = track.carStart.angle;
  car.speed = 0;


  if (isIntersection) {
    //episodeReward -= 500;
    brains.memory.add({ state: lastState, nextState: state, reward: -500, done: true, action })
  } else {
    brains.memory.add({ state: lastState, nextState: state, reward: 0, done: true, action })
  }

  await brains.train();
  //brains.memory.init(maxSteps);

  if (episode % updateInterval == 0) {
    brains.updateTargetModel();
  }

  moveData = {
    lastCheckpoint: -1
  }

  if (episodeReward > episodes[bestEpisode] || bestEpisode == -1) bestEpisode = episode;
  episodes.push(episodeReward)

  steps = 0;
  episodeReward = 0;
  lastState = undefined;
  episode += 1;
}

const canvasLength = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);

function calculateEnvironment(raycasts) {
  let environment = [
    car.angle / (2 * Math.PI),
    car.speed / car.maxSpeed
  ];

  for (let raycast of raycasts) {
    environment.push(raycast.distance /*/ canvasLength*/)
  }

  return environment
}

function calculateRewards(raycasts) {
  let smallestRaycast = raycasts.sort((a, b) => a.distance - b.distance)[0].distance / canvasLength;
  //let reward = -((0.1 - smallestRaycast) / 10);
  //let reward = -0.05;
  let reward = 0;

  let checkpointIntersected = carIntersectsCheckpoints();
  if (checkpointIntersected > -1) {
    //if (checkpointIntersected != moveData.lastCheckpoint) {
    if (checkpointIntersected == moveData.lastCheckpoint + 1) {
      moveData.lastCheckpoint = checkpointIntersected;
      reward += 5;
    }
  }

  if (carIntersectsFinish() && moveData.lastCheckpoint == track.checkpoints.length - 1) {
    moveData.lastCheckpoint = -1;
    reward += 500;
  }

  return reward;
}

/*function loop() {
    let raycasts = doRaycasts(24);
    let state = calculateEnvironment(raycasts);

    let action = brains.selectAction(state);

    if(carIntersectsSegments()){
      reset(state, action, true);
    } else if (steps >= maxSteps){
      reset(state, action, false);
    }

    let reward = calculateRewards();

    if(reward !== 0 && lastState){
        brains.memory.add({state: lastState, nextState: state, reward, done: false, action});
    }

    lastState = state;
    steps++;
    
    let direction = actionToDirection(action);

    update(manualDirection);
    //update(direction);
    draw(raycasts);

    requestAnimationFrame(loop);
}

loop();*/

let raycasts;

function drawButton(button){
  ctx.fillText(button.text, button.x + 20, button.textY);

  ctx.strokeStyle = `orange`;
  ctx.lineWidth = 2;

  ctx.strokeRect(
    button.x, 
    button.y, 
    button.width,
    button.height
  );
}

function makeButton(text, x, y, func){
  let textSize = ctx.measureText(text);

  buttons.push({
    text,
    textY: y,
    x: x, 
    y: y - textSize.actualBoundingBoxAscent - 5, 
    width: textSize.width + 40,
    height: textSize.actualBoundingBoxDescent + textSize.actualBoundingBoxAscent + 10,
    func
  })
}

let isFast = true;
let isExploring = true;

ctx.font = "24px serif";
makeButton(`Change speed`, 20, 180, () => {
  isFast = !isFast;
});

makeButton(`Stop/Continue exploring`, 250, 180, () => {
  isExploring = !isExploring;
});

function drawStatistics() {
  ctx.font = "24px serif";
  ctx.fillStyle = 'orange';

  ctx.fillText(`Episode: ${episode}`, 20, 50);
  ctx.fillText(`Epsilon: ${brains.epsilon.toFixed(2)}`, 20, 80);
  ctx.fillText(`Current Episode Reward: ${episodeReward.toFixed(1)}`, 20, 110);
  ctx.fillText(`Biggest Episode Reward: ${(episodes[bestEpisode] || 0).toFixed(1)}`, 20, 140);

  for(let button of buttons){
    drawButton(button)
  }
}

/*function drawLoop() {
  if (raycasts) {
    draw(raycasts);
  };

  drawStatistics()

  requestAnimationFrame(drawLoop);
}

drawLoop();*/

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function gameLoop() {
  //if (brains.epsilon > 0.75 && stepsTotal % 1000 == 0 && !isFast) {
  //  await sleep(1);
  //}

  if (steps == 0) {
    //let carSpawnpoint = findSpawnPoint(24);
    //track.carStart = carSpawnpoint;
  }

  raycasts = doRaycasts(24);
  let state = calculateEnvironment(raycasts);

  let action = brains.selectAction(state, !isExploring);

  if (carIntersectsSegments()) {
    return await reset(state, action, true);
  } else if (steps >= maxSteps) {
    return await reset(state, action, false);
  }

  let reward = calculateRewards(raycasts);
  episodeReward += reward;

  if (reward !== 0 && lastState) {
    brains.memory.add({ state: lastState, nextState: state, reward, done: false, action });
  }

  lastState = state;
  steps++;
  stepsTotal++;

  let direction = actionToDirection(action);

  update(direction);
  //update(manualDirection);
}

let lastDrawn = performance.now();
;((async () => {
  while(true){
    if(!isFast) await sleep(16.667);
    await gameLoop();

    if((Date.now() - lastDrawn) > 16.6){
      if (raycasts) {
        draw(raycasts);
      };
    
      drawStatistics()
      lastDrawn = performance.now();
    }
  }
})())





function actionToDirection(action) {
  action = actions[action];
  let isShifting = action.startsWith("shift+");
  if (isShifting) {
    action = action.substring("shift+".length);
  }

  return {
    brake: isShifting,
    w: action.includes("w"),
    a: action.includes("a"),
    s: action.includes("s"),
    d: action.includes("d")
  }
}

function findSpawnPoint(numRays) {
  while (true) {
    let randomX = Math.random();
    let randomY = Math.random();

    let checkpointsFound = 0;
    let furthestRay = null;
    let canContinue = true;
    const angleIncrement = 360 / numRays;

    for (let i = 0; i < numRays; i++) {
      const angle = i * angleIncrement + car.angle;
      const rad = angle * Math.PI / 180;

      let raycast = raycastFromCar({
        x1: randomX * canvas.width,
        y1: randomY * canvas.height,
        direction1: Math.cos(rad),
        direction2: Math.sin(rad),
      });


      if (raycast.distance < (car.width) || raycast.intersectionType == "wall") {
        canContinue = false;
        break;
      }

      if (!furthestRay || raycast.distance > furthestRay.distance) {
        furthestRay = { ...raycast, angle };
      }

      let checkpointRaycast = raycastFromCar({
        x1: randomX * canvas.width,
        y1: randomY * canvas.height,
        direction1: Math.cos(rad),
        direction2: Math.sin(rad),
      }, "checkpoints");

      if(checkpointRaycast.intersectionType == "checkpoint"){
        checkpointsFound += 1;
      }
    }

    if (!canContinue || checkpointsFound < numRays / 4) {
      continue;
    }

    //let angle = Math.atan2()
    let angle = furthestRay.angle;


    /*let closestCheckpoint = calculateClosestCheckpointDistance();

    if(closestCheckpoint.smallestIndex == track.checkpoints.length - 1){
      continue;
    }

    let currentCheckpoint = track.checkpoints[closestCheckpoint.smallestIndex];
    let nextCheckpoint = track.checkpoints[closestCheckpoint.smallestIndex + 1];

    let lookVector = [randomX - (currentCheckpoint.x1 + currentCheckpoint.x2) / 2, randomY - (currentCheckpoint.y1 + currentCheckpoint.y2) / 2]
    let angle = -Math.atan2(lookVector[1], lookVector[0]) * 57.2958;*/

    return {
      x: randomX,
      y: randomY,
      angle
    };
  }
}

function raycastFromCar(ray, mode="segments") {
  let minDist = Infinity;
  let intersectionType;

  track.segments.forEach(segment => {
    const intersectPoint = rayIntersectsLine(ray, { x1: segment.x1 * canvas.width, x2: segment.x2 * canvas.width, y1: segment.y1 * canvas.height, y2: segment.y2 * canvas.height });

    if (intersectPoint && intersectPoint.distance < minDist) {
      minDist = intersectPoint.distance;
      intersectionType = "segment"
    }
  });

  if (mode == "checkpoints") {
    track.checkpoints.forEach(checkpoint => {
      const intersectPoint = rayIntersectsLine(ray, { x1: checkpoint.x1 * canvas.width, x2: checkpoint.x2 * canvas.width, y1: checkpoint.y1 * canvas.height, y2: checkpoint.y2 * canvas.height });

      if (intersectPoint && intersectPoint.distance < minDist) {
        minDist = intersectPoint.distance;
        intersectionType = "checkpoint"
      }
    });
  }

  [
    { x1: 0, y1: 0, x2: canvas.width, y2: 0 },
    { x1: 0, y1: canvas.height, x2: canvas.width, y2: canvas.height },
    { x1: 0, y1: 0, x2: 0, y2: canvas.height },
    { x1: canvas.width, y1: 0, x2: canvas.width, y2: canvas.height },

  ].forEach(segment => {
    const intersectPoint = rayIntersectsLine(ray, segment);

    if (intersectPoint && intersectPoint.distance < minDist) {
      minDist = intersectPoint.distance;
      intersectionType = "wall";
    }
  });

  let endX = ray.x1 + ray.direction1 * minDist;
  let endY = ray.y1 + ray.direction2 * minDist;

  return {
    distance: minDist,
    x1: car.x / canvas.width,
    y1: car.y / canvas.height,
    x2: endX / canvas.width,
    y2: endY / canvas.height,
    intersectionType
  };
}

function doRaycasts(numRays) {
  const rays = [];
  const angleIncrement = 360 / numRays;

  for (let i = 0; i < numRays; i++) {
    const angle = i * angleIncrement + car.angle;
    const rad = angle * Math.PI / 180;

    rays.push(raycastFromCar({
      x1: car.x,
      y1: car.y,
      direction1: Math.cos(rad),
      direction2: Math.sin(rad)
    }))
  }

  return rays;
}

function carIntersectsSegments() {
  let intersects = false;

  for (let segment of track.segments) {
    if (lineIntersectsBox(car, segment)) {
      intersects = true;
      break;
    }
  }

  return intersects;
}

function calculateClosestCheckpointDistance() {
  let smallestDistance = Infinity;
  let smallestIndex = -1;

  for (let [index, checkpoint] of track.checkpoints.entries()) {
    let distance = getMinDistanceBoxToLine(car, checkpoint);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      smallestIndex = index;
      break;
    }
  }

  return { smallestDistance, smallestIndex };
}

function carIntersectsCheckpoints() {
  let intersects = -1;

  for (let [index, checkpoint] of track.checkpoints.entries()) {
    if (lineIntersectsBox(car, checkpoint)) {
      intersects = index;
      break;
    }
  }

  return intersects;
}

function carIntersectsFinish() {
  return lineIntersectsBox(car, track.startFinish);
}




function getMinDistanceBoxToLine(box, line) {
  const edges = getBoxEdges(box);
  let minDistance = Infinity;

  edges.forEach(corner => {
    const dist = pointToLineDistance(
      corner.x, corner.y,
      line.x1 * canvas.width, line.y1 * canvas.height,
      line.x2 * canvas.width, line.y2 * canvas.height
    );
    if (dist < minDistance) minDistance = dist;
  });

  for (let i = 0; i < edges.length; i++) {
    const next = (i + 1) % edges.length;
    const edgeDist = pointToLineDistance(
      (line.x1 * canvas.width + line.x2 * canvas.width) / 2,
      (line.y1 * canvas.height + line.y2 * canvas.height) / 2,
      edges[i].x, edges[i].y,
      edges[next].x, edges[next].y
    );
    if (edgeDist < minDistance) minDistance = edgeDist;
  }

  return minDistance;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  const param = len_sq !== 0 ? dot / len_sq : -1;

  let nearestX, nearestY;

  if (param < 0) {
    nearestX = x1;
    nearestY = y1;
  } else if (param > 1) {
    nearestX = x2;
    nearestY = y2;
  } else {
    nearestX = x1 + param * C;
    nearestY = y1 + param * D;
  }

  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

function getBoxEdges(box) {
  const { x, y, width, height, angle } = box;
  const rad = angle * Math.PI / 180;

  const corners = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 }
  ];

  return corners.map(corner => {
    const rotatedX = corner.x * Math.cos(rad) - corner.y * Math.sin(rad) + x;
    const rotatedY = corner.x * Math.sin(rad) + corner.y * Math.cos(rad) + y;
    return { x: rotatedX, y: rotatedY };
  });
}

function linesIntersect(p1, p2, q1, q2) {
  const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
  if (det === 0) return false;

  const u = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / det;
  const v = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / det;

  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function lineIntersectsBox(box, line) {
  const edges = getBoxEdges(box);

  for (let i = 0; i < edges.length; i++) {
    const next = (i + 1) % edges.length;

    if (linesIntersect(
      edges[i], edges[next],
      { x: line.x1 * canvas.width, y: line.y1 * canvas.height },
      { x: line.x2 * canvas.width, y: line.y2 * canvas.height }
    )) {
      return true;
    }
  }

  return false;
}

function rayIntersectsLine(ray, line) {
  const { x1: rayX1, y1: rayY1, direction1: rayDX, direction2: rayDY } = ray;
  const { x1: lineX1, y1: lineY1, x2: lineX2, y2: lineY2 } = line;

  const rayDirection = { x: rayDX, y: rayDY };
  const lineDirection = { x: lineX2 - lineX1, y: lineY2 - lineY1 };

  const denominator = rayDirection.x * lineDirection.y - rayDirection.y * lineDirection.x;

  if (denominator === 0) {
    return false;
  }

  const t = ((lineX1 - rayX1) * lineDirection.y - (lineY1 - rayY1) * lineDirection.x) / denominator;
  const u = ((lineX1 - rayX1) * rayDirection.y - (lineY1 - rayY1) * rayDirection.x) / denominator;

  if (t >= 0 && u >= 0 && u <= 1) {
    const intersectionX = rayX1 + t * rayDirection.x;
    const intersectionY = rayY1 + t * rayDirection.y;

    const distance = Math.sqrt((intersectionX - rayX1) ** 2 + (intersectionY - rayY1) ** 2);

    return { distance, x: intersectionX, y: intersectionY };
  }

  return false;
}

function getDistance(x1, y1, x2, y2) {
  return Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
}