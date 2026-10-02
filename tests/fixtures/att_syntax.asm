loop_fn:
	pushq	%rbp
	movq	%rsp, %rbp
	movl	$0, -4(%rbp)
.L2:
	cmpl	$9, -4(%rbp)
	jg	.L3
	addl	$1, -4(%rbp)
	jmp	.L2
.L3:
	movl	-4(%rbp), %eax
	popq	%rbp
	ret
