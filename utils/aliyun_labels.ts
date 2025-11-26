export const ALIYUN_LABELS: Record<string, string> = {
    // 广告法违规
    'ad_compliance_shampaign_tii': '图中文字疑似违反广告法-虚假宣传',
    'ad_compliance_healthCare_tii': '图中文字疑似违反广告法-医药保健',
    'ad_compliance_prohibit_tii': '图中文字疑似违反广告法-禁限售、烟酒',
    'ad_compliance_wordLimit_tii': '图中文字疑似违反广告法-极限词',

    // 违禁品
    'contraband_drug': '画面疑似毒品、药品',
    'contraband_drug_tii': '图中文字疑似描述违禁毒品',
    'contraband_gamble': '画面疑似赌博物品',
    'contraband_gamble_tii': '图中文字疑似描述赌博行为',
    'contraband_certificate_tii': '图中文字疑似含办证套现类广告引流',

    // 色情内容
    'pornographic_adultContent': '疑似含有成人色情内容',
    'pornographic_adultToys': '画面中疑似含有成人器具内容',
    'pornographic_artwork': '画面中疑似含有艺术品色情内容',
    'pornographic_adultContent_tii': '图片中文字疑似色情内容',
    'sexual_suggestiveContent': '画面疑似低俗或性暗示内容',
    'sexual_breastNudity': '画面疑似含有凸点轮廓内容',
    'sexual_cleavage': '画面疑似含有女性乳沟特征',
    'sexual_femaleUnderwear': '画面疑似含有内衣泳衣内容',
    'sexual_femaleShoulder': '画面疑似含有肩部性感内容',
    'sexual_femaleLeg': '画面疑似含有腿部性感内容',
    'sexual_maleTopless': '画面疑似含有男性赤膊内容',
    'sexual_cartoon': '画面疑似含有卡通性感内容',
    'sexual_pregnancy': '画面疑似含有孕照哺乳内容',
    'sexual_underage': '画面疑似含有儿童性感内容',

    // 政治敏感
    'political_historicalNihility': '画面疑似涉及虚无历史或不宜传播的历史事件',
    'political_historicalNihility_tii': '图中文字疑似历史虚无',
    'political_politicalFigure': '画面疑似涉及政治人物',
    'political_politicalFigure_2': '画面疑似涉及领导人家属',
    'political_politicalFigure_3': '画面疑似涉及省、市政府人员',
    'political_politicalFigure_4': '画面疑似涉及国外领导人及家属',
    'political_politicalFigure_name_tii': '图中文字含领导人姓名',
    'political_politicalFigure_metaphor_tii': '图中文字疑似含有对主要领导人的代称、暗喻',
    'political_prohibitedPerson_tii': '图中文字含落马官员的姓名',
    'political_taintedCelebrity': '画面疑似包含劣迹或重大负面的公众人物',
    'political_taintedCelebrity_tii': '图中文字疑似有劣迹艺人的姓名',
    'political_CNflag': '画面疑似含有中国国旗',
    'political_otherflag': '画面疑似含有其他国家国旗',
    'political_CNMap': '画面疑似含有中国地图',
    'political_logo': '画面疑似含有禁宣媒体标识',
    'political_outfit': '画面疑似含有军警服装、作战部队服装',
    'political_badge': '画面疑似含有国徽、党徽',
    'political_racism_tii': '图中文字疑似含有特殊的表达',

    // 暴恐内容
    'violent_armedForces': '画面疑似包含暴恐组织',
    'violent_crowding': '画面疑似有人群聚集',
    'violent_gun': '画面疑似包含枪支',
    'violent_Knives': '画面疑似包含刀具',
    'violent_gunKnives_tii': '图中文字含枪支刀具的描述',
    'violent_blood': '画面疑似含有血腥内容',
    'violent_horrific': '画面疑似包含惊悚内容',
    'violent_horrific_tii': '图中文字疑似描述暴力、恐怖的内容',

    // 宗教信仰
    'religion_funeral': '画面疑似含有葬礼灵堂内容',
    'religion_buddhism': '疑似含有特定服饰或标识',
    'religion_christianity': '疑似含有基督教内容',
    'religion_muslim': '疑似含有伊斯兰教内容',
    'religion_tii': '图中文字疑似涉及宗教内容',

    // 其他不当内容
    'racism_tii': '图中文字疑似涉及种族歧视',
    'PDA_kiss': '画面疑似包含亲吻内容',
    'PDA_physicalContact': '画面疑似包含亲密行为',
    'object_landmark': '画面疑似包含国内地标内容',
    'object_rmb': '画面疑似包含人民币、硬币',
    'object_wn': '画面疑似包含特定形象',
    'pt_logotoSocialNetwork': '画面中含有常见网络社交平台水印',
    'pt_qrCode': '图中包含二维码',
    'pt_programCode': '图中包含小程序码',
    'pt_toDirectContact_tii': '图中文字疑似含有特定引流信息',
    'pt_toSocialNetwork_tii': '图中文字疑似含有社交平台引流信息',
    'pt_toShortVideos_tii': '图中文字疑似含有短视频引流信息',
    'pt_investment_tii': '图中文字疑似含有投资理财引流信息',
    'pt_recruitment_tii': '图中文字疑似含有招聘引流信息',
    'inappropriate_smoking': '画面疑似包含烟相关内容',
    'inappropriate_drinking': '画面疑似包含酒相关内容',
    'inappropriate_tattoo': '画面疑似包含纹身内容',
    'inappropriate_middleFinger': '画面疑似包含竖中指内容',
    'inappropriate_foodWasting': '画面疑似包含浪费粮食内容'
};

export function getLabelDescription(label: string): string {
    return ALIYUN_LABELS[label] || `未知违规标签: ${label}`;
}
