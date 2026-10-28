import { describe, expect, it } from 'vitest'
import {
  coupleNames,
  formalDate,
  otherGroups,
  parentGroups,
  romanYear,
} from '../stationeryService'

describe('stationeryService', () => {
  it('parte los nombres de la pareja con &, y o e', () => {
    expect(coupleNames('Isabella & Mateo')).toEqual(['Isabella', 'Mateo'])
    expect(coupleNames('Nadia Alejandra y Eduardo Alonso')).toEqual([
      'Nadia Alejandra',
      'Eduardo Alonso',
    ])
    expect(coupleNames('Ana e Ignacio')).toEqual(['Ana', 'Ignacio'])
    expect(coupleNames('Nat')).toEqual(['Nat'])
    expect(coupleNames('  ')).toEqual([])
    expect(coupleNames(undefined)).toEqual([])
  })

  it('separa a los papás de los padrinos', () => {
    const family = [
      { role: 'Papás de la novia', names: ['A', 'B'] },
      { role: 'Padrinos de velación', names: ['C'] },
      { role: 'Mis padres', names: ['D'] },
      { role: 'Madrina de ramo', names: ['E'] },
      { role: 'Abuelos', names: ['F'] },
    ]
    expect(parentGroups(family).map((g) => g.role)).toEqual(['Papás de la novia', 'Mis padres'])
    expect(otherGroups(family).map((g) => g.role)).toEqual([
      'Padrinos de velación',
      'Madrina de ramo',
      'Abuelos',
    ])
  })

  it('escribe la fecha como en una tarjeta impresa', () => {
    expect(formalDate({ weekday: 'sábado', day: '23', month: 'octubre', year: '2027' })).toBe(
      'Sábado 23 de octubre de 2027',
    )
  })

  it('pasa el año a romanos', () => {
    expect(romanYear('2027')).toBe('MMXXVII')
    expect(romanYear('1994')).toBe('MCMXCIV')
    expect(romanYear('otoño')).toBe('otoño')
  })
})
