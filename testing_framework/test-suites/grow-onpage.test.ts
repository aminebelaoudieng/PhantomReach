import {describe,it,expect} from "vitest";
import {parsePage,pageChecks} from "../../src/lib/grow/onpage";
import {publicIPv4} from "../../src/lib/grow/public-page";
describe("Cheerio public HTML analysis",()=>{
 it("reads SEO tags, headings, images, contact and JSON-LD",()=>{const p=parsePage(Buffer.from('<html><head><title>Nettoyage Montréal</title><meta name="description" content="Services locaux"><script type="application/ld+json">{"@type":"LocalBusiness"}</script></head><body><h1>Nettoyage</h1><img src="a.png"><img src="b.png" alt=""><a href="tel:123">Appeler</a><a href="/services">Services</a><form></form><button>Demander une soumission</button></body></html>'),"https://example.com");expect(p.title).toBe("Nettoyage Montréal");expect(p.missingAlt).toBe(1);expect(p.formCount).toBe(1);expect(p.contactLinkCount).toBe(1);expect(p.internalLinks).toBe(1);expect(p.schemaTypes).toContain("LocalBusiness");expect(pageChecks(p).find(c=>c.label==="Textes alternatifs")?.state).toBe("improve");});
 it("does not claim contact is absent for JS-rendered pages",()=>{const p=parsePage(Buffer.from('<div id="root"></div>'),"https://example.com");expect(pageChecks(p).find(c=>c.label==="Moyens de contact")?.state).toBe("unknown");});
 it("rejects private and reserved destinations",()=>{for(const ip of ["127.0.0.1","10.0.0.1","169.254.169.254","192.168.1.1","172.16.2.1","100.64.0.1","192.0.2.1","198.18.0.1","203.0.113.2","::1"])expect(publicIPv4(ip)).toBe(false);expect(publicIPv4("8.8.8.8")).toBe(true);});
});
