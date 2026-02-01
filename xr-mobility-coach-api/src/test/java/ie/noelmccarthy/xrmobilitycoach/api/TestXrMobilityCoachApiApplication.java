package ie.noelmccarthy.xrmobilitycoach.api;

import org.springframework.boot.SpringApplication;

public class TestXrMobilityCoachApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(XrMobilityCoachApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
