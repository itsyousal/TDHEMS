# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: DH
      - heading "The Dough House" [level=1] [ref=e6]
      - paragraph [ref=e7]: Enterprise Management System
    - generic [ref=e8]:
      - heading "Sign In" [level=2] [ref=e9]
      - generic [ref=e10]:
        - img [ref=e11]
        - paragraph [ref=e14]: User not found
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Email Address
          - textbox "Email Address" [ref=e18]:
            - /placeholder: you@example.com
            - text: ui.test.employee+1764419033333@doughhouse.local
        - generic [ref=e19]:
          - generic [ref=e20]: Password
          - textbox "Password" [ref=e21]:
            - /placeholder: ••••••••
            - text: employee123
        - button "Sign In" [ref=e22]:
          - img [ref=e23]
          - generic [ref=e26]: Sign In
      - generic [ref=e27]:
        - paragraph [ref=e28]: "Demo Credentials:"
        - paragraph [ref=e29]: "Email: admin@doughhouse.local"
        - paragraph [ref=e30]: "Password: password123"
    - paragraph [ref=e31]:
      - text: For support, contact
      - link "support@doughhouse.local" [ref=e32] [cursor=pointer]:
        - /url: mailto:support@doughhouse.local
  - button "Open Next.js Dev Tools" [ref=e38] [cursor=pointer]:
    - img [ref=e39]
  - alert [ref=e42]
```