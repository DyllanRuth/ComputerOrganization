window.addEventListener('load', () => {
    const opcodes = {
      'store': 160,
      'load': 161,
      'addi': 44,
      'subi': 45,
      'add': 50,
      'sub': 51,
      'mul': 52,
      'div': 53,
      'jpos': 127,
      'jzero': 128,
      'halt': 0
    }
  
    const numericOpCodes = [160, 161, 44, 45, 50, 52, 52, 127, 128, 0]
  
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
    const axCell = document.getElementById('ax')
    let halted = false
  
    const step = async () => {
      let pc = await read(pcCell, 'read')
      let opcode = await read(memCells[pc])
      if (opcode === 0 || !numericOpCodes.includes(opcode)) return false
      let arg = await read(memCells[pc + 1])
      if (opcode === 160) { // STORE
        await write(memCells[arg], await read(axCell))
        pc += 2
      } else if (opcode === 161) { // LOAD
        await write(axCell, await read(memCells[arg]))
        pc += 2
      } else if (opcode === 44) { // ADDI
        await write(axCell, await read(axCell) + arg)
        pc += 2
      } else if (opcode === 45) { // SUBI
        await write(axCell, await read(axCell) - arg)
        pc += 2
      } else if (opcode === 50) { // ADD
        await write(axCell, await read(axCell) + await read(memCells[arg]))
        pc += 2
      } else if (opcode === 51) { // SUB
        await write(axCell, await read(axCell) - await read(memCells[arg]))
        pc += 2
      } else if (opcode === 52) { // MUL
        await write(axCell, await read(axCell) * await read(memCells[arg]))
        pc += 2
      } else if (opcode === 53) { // DIV
        await write(axCell, divide(await read(axCell), await read(memCells[arg])))
        pc += 2
      } else if (opcode === 127) { // JPOS
        if (await read(axCell) > 0) pc = arg; else pc += 2
      } else if (opcode === 128) { // JZERO
        if (await read(axCell) === 0) pc = arg; else pc += 2        
      }
      write(pcCell, pc)
      return true 
    }
  
    const run = async () => {
      halted = false
      let more = true
      pcCell.value = '0'
      axCell.value = ''
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
        let ax = 0
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
            if (opcode === 160) { // STORE
              mem[arg] = ax
              pc += 2
            } else if (opcode === 161) { // LOAD
              ax = mem[arg]
              pc += 2
            } else if (opcode === 44) { // ADDI
              ax = ax + arg
              pc += 2
            } else if (opcode === 45) { // SUBI
              ax = ax - arg
              pc += 2
            } else if (opcode === 50) { // ADD
              ax = ax + mem[arg]
              pc += 2
            } else if (opcode === 51) { // SUB
              ax = ax - mem[arg]
              pc += 2
            } else if (opcode === 52) { // MUL
              ax = ax * mem[arg]
              pc += 2
            } else if (opcode === 53) { // DIV
              ax = divide(ax, mem[arg])
              pc += 2
            } else if (opcode === 127) { // JPOS
              if (ax > 0) pc = arg; else pc += 2
            } else if (opcode === 128) { // JZERO
              if (ax === 0) pc = arg; else pc += 2        
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
    document.getElementById('halt').addEventListener('click', () => { halted = true })
    document.getElementById('sample1').addEventListener('click', () =>
      setSample({ '0': 'load', '1': 99, '2': 'subi', '3': 1, '4': 'jpos', '5': 2, '6': 'halt', '99': 5 }))
    document.getElementById('sample2').addEventListener('click', () =>
      setSample({ '0': 'load', '1': 32, '2': 'store', '3': 31,
                  '4': 'load', '5': 30, '6': 'mul', '7': 31,
                  '8': 'store', '9': 31, '10': 'load', '11': 30,
                  '12': 'subi', '13': 1, '14': 'store', '15': 30,
                  '16': 'jpos', '17': 6, '18': 'halt',
                  '30': 4, '31': 0, '32': 1
                }))
    document.getElementById('sample3').addEventListener('click', () =>
      setSample({ '0': 'load', '1': 52, '2': 'add', '3': 50,
                  '4': 'store', '5': 50, '6': 'load', '7': 1,
                  '8': 'addi', '9': 1, '10': 'store', '11': 1,
                  '12': 'load', '13': 51, '14': 'subi', '15': 1,
                  '16': 'store', '17': 51, '18': 'jpos', '19': 0,
                  '20': 'halt',
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
  