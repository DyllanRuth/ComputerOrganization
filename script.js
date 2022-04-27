window.addEventListener('load', () => {
    const opcodes = {
      'claim': 160,
      'place': 161,
      'do_next': 44,
      'do_prev': 45,
      'do_add': 50,
      'do_sub': 51,
      'goto': 127,
      'goto2': 128,
      'stop': 0
    }
  
    const numericOpCodes = [160, 161, 44, 45, 50, 51, 127, 128, 0]
  
    const opcodeOf = n => {
      if (typeof n === 'string' && n.toLowerCase() in opcodes) return opcodes[n.toLowerCase()]
      const num = parseInt(n)
      return numericOpCodes.includes(num) ? num : undefined
    }
  
    const animationDelay = () => {
      const delay = parseInt(document.getElementById('delay').value)
      return isNaN(delay) ? 0 : delay
    }
  
    const delay = (action, milliseconds) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(action()), milliseconds)
      })                     
    }
  
    const animate = async (cell, style) => {
      cell.classList.add(style)
      return await delay(() => cell.classList.remove(style), animationDelay())  
    }
  
    const write = async (cell, newValue) => {
      cell.value = newValue
      return animate(cell, 'write')
    }
  
    const numValue = value => {
      let result
      if (typeof value === 'number') return value
      let op = opcodeOf(value)
      if (op !== undefined) result = op
      else {
        result = parseInt(value)
        if (isNaN(result)) result = 0
      } 
      return result
    }
  
    const read = async (cell) => {
      let result = numValue(cell.value)
      await animate(cell, 'read')
      return result
    }
  
    const divide = (x, y) => y === 0 ? x : Math.floor(x / y)
  
    const memCells = []
    const pcCell = document.getElementById('pc')
    const bxCell = document.getElementById('bx')
    let halted = false
  
    const step = async () => {
      let pc = await read(pcCell, 'read')
      let opcode = await read(memCells[pc])
      if (opcode === 0 || !numericOpCodes.includes(opcode)) return false
      let arg = await read(memCells[pc + 1])
      if (opcode === 160) { // claim
        await write(memCells[arg], await read(bxCell))
        pc += 2
      } else if (opcode === 161) { // place
        await write(bxCell, await read(memCells[arg]))
        pc += 2
      } else if (opcode === 44) { // do_next
        await write(bxCell, await read(bxCell) + arg)
        pc += 2
      } else if (opcode === 45) { // do_prev
        await write(bxCell, await read(bxCell) - arg)
        pc += 2
      } else if (opcode === 50) { // do_add
        await write(bxCell, await read(bxCell) + await read(memCells[arg]))
        pc += 2
      } else if (opcode === 51) { // do_sub
        await write(bxCell, await read(bxCell) - await read(memCells[arg]))
        pc += 2
      } else if (opcode === 127) { // goto
        if (await read(bxCell) > 0) pc = arg; else pc += 2
      } else if (opcode === 128) { // goto2
        if (await read(bxCell) === 0) pc = arg; else pc += 2        
      }
      write(pcCell, pc)
      return true 
    }
  
    const run = async () => {
      halted = false
      let more = true
      pcCell.value = '0'
      bxCell.value = ''
      while (more && !halted) {
        more = await step()
      } 
    }
  
    const setSample = sample => {
      for (let key in memCells) memCells[key].value = ''
      for (let key in sample) 
        memCells[key].value = '' + sample[key]
    }
  
    const check = (restoring) => {
      document.getElementById('results').innerHTML = ''
      const savedMem = memCells.map(c => c.value)
      let passes = 0
      for (const r of runs) {
        const mem = savedMem.map(m => numValue(m))
        let pc = 0
        let bx = 0
        for (let key in r.before) 
          mem[key] = numValue(r.before[key])
        const MAX_STEPS = 1000
        let more = true
        let steps = 0
        while (more && steps < MAX_STEPS) {
          steps++
          const opcode = opcodeOf(mem[pc])
          if (opcode === 0 || !numericOpCodes.includes(opcode))
            more = false
          else {
            const arg = mem[pc + 1]
            if (opcode === 160) { // CLAIM
              mem[arg] = bx
              pc += 2
            } else if (opcode === 161) { // PLACE
              bx = mem[arg]
              pc += 2
            } else if (opcode === 44) { // DO_NEXT
              bx = bx + arg
              pc += 2
            } else if (opcode === 45) { // DO_PREV
              bx = bx - arg
              pc += 2
            } else if (opcode === 50) { // DO_ADD
              bx = bx + mem[arg]
              pc += 2
            } else if (opcode === 51) { // DO_SUB
              bx = bx - mem[arg]
              pc += 2
            } else if (opcode === 127) { // GOTO
              if (bx > 0) pc = arg; else pc += 2
            } else if (opcode === 128) { // GOTO2
              if (bx === 0) pc = arg; else pc += 2        
            }
          }
        }
        let success = true
        for (let key in r.after) 
          if (mem[key] !== numValue(r.after[key])) success = false
        if (success) passes++
        const liElement = document.createElement('li')
        document.getElementById('results').appendChild(liElement)
        const spanElement = document.createElement('span')
        liElement.textContent = success ? 'Pass' : 'Fail'
        liElement.appendChild(spanElement)
        const buttonElement = document.createElement('button')
        buttonElement.textContent = 'Replay'
        buttonElement.addEventListener('click', () => {
          for (let key in memCells) memCells[key].value = ''
          for (let key in savedMem) 
            memCells[key].value = savedMem[key]
          for (let key in r.before) 
            memCells[key].value = '' + r.before[key]
          run()
        })
        liElement.appendChild(buttonElement)
        if (restoring === undefined)
          EPUB.Education.reportScores([{ location: 'default', score: passes / runs.length, metadata: savedMem }])
      }
    }
    
    const mem = document.getElementById('mem')
    for (let i = 0; i <= 10; i++) {
      const tr = document.createElement('tr')
      mem.appendChild(tr)
      for (let j = 0; j <= 10; j++) {
        const td = document.createElement('td')
        tr.appendChild(td)
        if (i < 10 && j < 10) {
          const input = document.createElement('input')
          input.id = 'mem' + i + j
          input.setAttribute('size', 5)
          td.appendChild(input)
          memCells.push(input)
        }
        else if (i == 10 && j == 10)
          td.textContent = 'Memory'
        else if (i == 10)
          td.textContent = j
        else if (j == 10)
          td.textContent = 10 * i
      }    
    }
    document.getElementById('run').addEventListener('click', run)
    document.getElementById('step').addEventListener('click', step)
    document.getElementById('stop').addEventListener('click', () => { halted = true })
    document.getElementById('sample1').addEventListener('click', () =>
      setSample({ '0': 'place', '1': 99, '2': 'do_prev', '3': 1, '4': 'goto', '5': 2, '6': 'stop', '99': 5 }))
    document.getElementById('sample2').addEventListener('click', () =>
      setSample({ '0': 'place', '1': 32, '2': 'claim', '3': 31,
                  '4': 'place', '5': 30,
                  '8': 'claim', '9': 31, '10': 'place', '11': 30,
                  '12': 'do_prev', '13': 1, '14': 'claim', '15': 30,
                  '16': 'goto', '17': 6, '18': 'stop',
                  '30': 4, '31': 0, '32': 1
                }))
    document.getElementById('sample3').addEventListener('click', () =>
      setSample({ '0': 'place', '1': 52, '2': 'do_add', '3': 50,
                  '4': 'claim', '5': 50, '6': 'place', '7': 1,
                  '8': 'do_next', '9': 1, '10': 'claim', '11': 1,
                  '12': 'place', '13': 51, '14': 'do_prev', '15': 1,
                  '16': 'claim', '17': 51, '18': 'goto', '19': 0,
                  '20': 'stop',
                  '50': 0, '51': 5, '52': 10, '53': 20, '54': 30, '55': 40, '56': 50
                }))
    if (typeof runs !== 'undefined') {
      const checkButton = document.createElement('button')
      checkButton.textContent = 'Check'
      document.getElementById('check').appendChild(checkButton)
      checkButton.addEventListener('click', check)
    }
    EPUB.Education.getScores(['default'], (scores) => { 
      for (let key in memCells) memCells[key].value = ''
      for (let key in scores[0].metadata)
        memCells[key].value = scores[0].metadata[key]
      check('restoring')
    })
  })
  