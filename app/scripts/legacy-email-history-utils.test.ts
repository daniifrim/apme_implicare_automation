import { describe, expect, it } from 'vitest'

import {
  chunkArray,
  getTemplateLookupKeys,
  normalizeTemplateName,
  parseLegacySentDate
} from './legacy-email-history-utils'

describe('legacy-email-history-utils', () => {
  describe('normalizeTemplateName', () => {
    it('should normalize diacritics, punctuation, and spacing', () => {
      expect(normalizeTemplateName('  Rugăciune pentru grup etnic  ')).toBe('rugaciune pentru grup etnic')
      expect(normalizeTemplateName('Info despre cursul Împuternicit pentru a influența')).toBe(
        'info despre cursul imputernicit pentru a influenta'
      )
      expect(normalizeTemplateName('Info  Tabere  Misiune   APME')).toBe('info tabere misiune apme')
    })

    it('should return empty string for falsy input', () => {
      expect(normalizeTemplateName('')).toBe('')
      expect(normalizeTemplateName(null as never)).toBe('')
      expect(normalizeTemplateName(undefined as never)).toBe('')
    })
  })

  describe('parseLegacySentDate', () => {
    it('should parse dd/mm/yyyy with time', () => {
      const d = parseLegacySentDate('29/11/2023, 18:17')
      expect(d).not.toBeNull()

      // Validate via local getters to match how we construct the Date
      expect(d?.getFullYear()).toBe(2023)
      expect(d?.getMonth()).toBe(10) // 0-indexed
      expect(d?.getDate()).toBe(29)
      expect(d?.getHours()).toBe(18)
      expect(d?.getMinutes()).toBe(17)
    })

    it('should parse dd/mm/yyyy without time', () => {
      const d = parseLegacySentDate('12/6/2025')
      expect(d).not.toBeNull()
      expect(d?.getFullYear()).toBe(2025)
      expect(d?.getMonth()).toBe(5)
      expect(d?.getDate()).toBe(12)
      expect(d?.getHours()).toBe(0)
      expect(d?.getMinutes()).toBe(0)
    })

    it('should return null for invalid input', () => {
      expect(parseLegacySentDate('')).toBeNull()
      expect(parseLegacySentDate('not a date')).toBeNull()
      expect(parseLegacySentDate('2025-06-12')).toBeNull()
      expect(parseLegacySentDate('99/99/9999')).toBeNull()
    })
  })

  describe('getTemplateLookupKeys', () => {
    it('should generate candidates for Info prefix and Both prefix', () => {
      expect(getTemplateLookupKeys('Rugăciune pentru misionari')).toEqual(
        expect.arrayContaining([
          'rugaciune pentru misionari',
          'info rugaciune pentru misionari'
        ])
      )

      expect(getTemplateLookupKeys('Both - Rugăciune pentru grup etnic')).toEqual(
        expect.arrayContaining([
          'rugaciune pentru grup etnic',
          'info rugaciune pentru grup etnic'
        ])
      )

      expect(getTemplateLookupKeys('Info Donații APME')).toEqual(
        expect.arrayContaining([
          'info donatii apme',
          'donatii apme'
        ])
      )
    })
  })

  describe('chunkArray', () => {
    it('should chunk arrays into requested sizes', () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })
  })
})
