Dump of assembler code for function calculate:
   0x0000000000001200 <+0>:	endbr64 
   0x0000000000001204 <+4>:	push   rbp
   0x0000000000001205 <+5>:	mov    rbp,rsp
   0x0000000000001208 <+8>:	mov    DWORD PTR [rbp-0x4],edi
   0x000000000000120b <+11>:	cmp    DWORD PTR [rbp-0x4],0xa
   0x000000000000120f <+15>:	jle    0x121d <calculate+29>
   0x0000000000001211 <+17>:	mov    eax,DWORD PTR [rbp-0x4]
   0x0000000000001214 <+20>:	add    eax,0x2
   0x0000000000001217 <+23>:	jmp    0x1224 <calculate+36>
   0x0000000000001219 <+25>:	nop    DWORD PTR [rax+0x0]
   0x000000000000121d <+29>:	mov    eax,DWORD PTR [rbp-0x4]
   0x0000000000001220 <+32>:	sub    eax,0x1
   0x0000000000001224 <+36>:	pop    rbp
   0x0000000000001225 <+37>:	ret    
End of assembler dump.
