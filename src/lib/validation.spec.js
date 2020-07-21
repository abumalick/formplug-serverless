const describe = require('mocha').describe
const it = require('mocha').it
const assert = require('chai').assert

const {isWebsite} = require('./validation')

describe('Website Validation', () => {
    it('should accept standard website url', () => {
        const result = isWebsite('http://perdu.com')
        assert.isTrue(result)
    })

    it('should accept standard website url with www', () => {
        const result = isWebsite('https://www.perdu.com/some/path?success=true')
        assert.isTrue(result)
    })

    it('should accept localhost', () => {
        const result = isWebsite('http://localhost/')
        assert.isTrue(result)
    })
})