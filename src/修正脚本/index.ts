import { waitGlobalInitialized, eventOn, Mvu } from '@classes';

const 正确角色名 = ['殷姒', '珠罗刹', '知春困'];

// 简单的繁简转换映射表
const 简繁映射: Record<string, string> = {
  姒: '姒',
  罗: '羅',
  刹: '剎',
  春: '春',
  困: '睏',
};

// 检查是否包含繁体字
function toSimplified(str: string): string {
  let result = str;
  for (const [traditional, simplified] of Object.entries(简繁映射)) {
    result = result.replace(new RegExp(traditional, 'g'), simplified);
  }
  return result;
}

// 角色名纠错：基于字符匹配的智能纠错
function 纠错角色名(name: string): string {
  // 先尝试完整匹配
  if (正确角色名.includes(name)) {
    return name;
  }

  // 繁简转换后再匹配
  const simplifiedName = toSimplified(name);
  if (正确角色名.includes(simplifiedName)) {
    return simplifiedName;
  }

  // 逐个角色名尝试匹配
  for (const 正确名 of 正确角色名) {
    const 简化正确名 = toSimplified(正确名);

    // 如果名字长度完全匹配但有字符不同，进行逐字比较
    if (name.length === 简化正确名.length) {
      let 差异字符数 = 0;

      for (let i = 0; i < name.length; i++) {
        if (name[i] !== 简化正确名[i]) {
          差异字符数++;
        }
      }

      // 如果只有1个字符不同，认为可以修正
      if (差异字符数 === 1) {
        return 简化正确名;
      }
    }

    // 处理名字中间有符号或漏字的情况
    // 例如：殷X姒、珠X罗刹、知X春困
    for (let i = 1; i < 简化正确名.length - 1; i++) {
      const 前缀 = 简化正确名.slice(0, i);
      const 后缀 = 简化正确名.slice(i);

      // 检查名字是否包含前缀和后缀，中间可能有其他字符
      if (name.startsWith(前缀) && name.endsWith(后缀)) {
        const 中间部分 = name.slice(前缀.length, name.length - 后缀.length);

        // 如果中间只有一个非中文字符（符号）或空（漏字），则修正
        if (中间部分.length <= 2 && !/[\u4e00-\u9fa5]/.test(中间部分)) {
          return 简化正确名;
        }
      }
    }

    // 检查是否只是多了字符
    if (name.includes(简化正确名)) {
      return 简化正确名;
    }

    // 检查是否是包含了部分字符但有遗漏（漏字情况）
    let 匹配计数 = 0;
    for (const char of name) {
      if (简化正确名.includes(char)) {
        匹配计数++;
      }
    }
    // 如果名字中大部分字符都匹配，且长度相近，认为是漏字
    if (匹配计数 >= 简化正确名.length - 1 && name.length <= 简化正确名.length + 1) {
      return 简化正确名;
    }
  }

  return name;
}

// 需要补全前缀的变量名
const 需要剧情前缀 = ['当前事件', '事件大纲', '当前幕'];

// 变量名纠错映射（可能的错字 → 正确变量名）
const 变量名纠错: Record<string, string> = {
  '当前事': '当前事件',
  '当前大': '当前事件',
  '事件': '当前事件',
  '当前剧情': '当前事件',
  '剧情': '当前事件',
  '事件大': '事件大纲',
  '大纲': '事件大纲',
  '当前幕': '当前幕',
  '幕': '当前幕',
};

async function init() {
  await waitGlobalInitialized('Mvu');

  eventOn(Mvu.events.COMMAND_PARSED, commands => {
    let modified = false;

    commands.forEach(command => {
      const cmdName = command.name;

      // 处理 set_var 和 get_var 等变量操作命令
      if (['set_var', 'get_var', 'add_var', 'sub_var', 'toggle_var', 'append_var', 'remove_var'].includes(cmdName)) {
        if (command.args && command.args.length > 0) {
          // 第一个参数是变量名
          let varName = command.args[0];

          // 1. 变量名纠错
          const correctedVarName = 变量名纠错[varName];
          if (correctedVarName) {
            varName = correctedVarName;
            modified = true;
          }

          // 2. 角色名纠错（支持中间有符号或漏字的情况）
          const newCharName = 纠错角色名(varName);
          if (newCharName !== varName) {
            varName = newCharName;
            modified = true;
          }

          // 3. 如果是"个人属性"或"个人状态"但没有剧情前缀，自动加上
          if (varName === '个人属性' || varName === '个人状态') {
            varName = '剧情.' + varName;
            modified = true;
          }

          // 4. 如果是"当前事件"但没有剧情前缀，自动加上
          if (需要剧情前缀.includes(varName) && !varName.includes('剧情.')) {
            varName = '剧情.' + varName;
            modified = true;
          }

          command.args[0] = varName;
        }
      }

      // 处理 set_status 命令（角色状态更新）
      if (cmdName === 'set_status') {
        if (command.args && command.args.length > 0) {
          const charName = 纠错角色名(command.args[0]);
          if (charName !== command.args[0]) {
            command.args[0] = charName;
            modified = true;
          }
        }
      }

      // 处理 add_card 或类似命令
      if (['add_card', 'set_card_status'].includes(cmdName)) {
        if (command.args && command.args.length > 0) {
          const charName = 纠错角色名(command.args[0]);
          if (charName !== command.args[0]) {
            command.args[0] = charName;
            modified = true;
          }
        }
      }
    });

    if (modified) {
      console.info('[修正脚本] 已自动修正变量名/角色名');
    }
  });
}

$(() => {
  errorCatched(init)();
});
